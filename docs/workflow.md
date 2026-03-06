# Workflow

## Canonical Event-to-IO Flow

The platform uses this sequence for all automated learner/data operations:

1. `learner_event` or `database_event` fires.
2. Slack Workflow Builder starts workflow step(s).
3. Workflow calls Apps Script `doPost(e)`.
4. Apps Script dispatches to workflow action handlers by action key.
5. Apps Script performs Google Sheets duplex read/write and returns structured outputs.

See `architecture.md` for the canonical data-flow diagram.

## Workflow Action Keys and Handler Mapping

Dedicated Apps Script handlers (in `apps-script/workflow.gs`) are mapped through `routeWorkflowActionKey` in `apps-script/router.gs`.

| Action key | Handler | Purpose |
| --- | --- | --- |
| `workflow.onboarding.start` | `handleWorkflowOnboardingStart` | Create/check learner profile and return onboarding next steps. |
| `workflow.lesson_release.prepare` | `handleWorkflowLessonReleasePrepare` | Validate lesson release packet and open human approval gate. |
| `workflow.lesson_release.publish` | `handleWorkflowLessonReleasePublish` | Publish lesson after explicit human approval. |
| `workflow.content_review.submit` | `handleWorkflowContentReviewSubmit` | Submit review request into approval queue. |
| `workflow.content_review.approve` | `handleWorkflowContentReviewApprove` | Apply final approval status from human reviewer. |
| `workflow.health` | `handleWorkflowHealthCheck` | Lightweight router health check for operations. |

## 1) Onboarding Flow

**Trigger point**
- New learner enters from `/onboard` slash command (shortcut trigger) or admin/workflow trigger event.

**Step-by-step inputs/outputs**
1. Trigger sends `workflow.onboarding.start` with input:
   - `userId` (required)
   - `userName` (optional)
   - `source` (optional)
2. `handleWorkflowOnboardingStart` checks `Learners` by `UserID`.
3. If learner is missing, handler writes new row to `Learners` and returns:
   - `status: completed`
   - `learner` object
   - `message` with next learner actions.
4. If learner exists, handler returns:
   - `status: already_exists`
   - existing `learner` object
   - `message` with guidance.

**Human approval points**
- None. This flow is auto-approved.

**Apps Script endpoint action key**
- `workflow.onboarding.start`

## 2) Lesson Release Flow

**Trigger point**
- Content ops initiates release from workflow step (optionally via shortcut), starting with a lesson in `draft` status.

**Step-by-step inputs/outputs**
1. Trigger sends `workflow.lesson_release.prepare` with input:
   - `lessonId` (required)
   - `reviewerUserId` (required for routing approvals)
   - `notes` (optional)
2. `handleWorkflowLessonReleasePrepare` validates lesson exists and is release-ready.
3. Handler returns approval packet:
   - `status: pending_approval`
   - `approvalToken`
   - `requiresApproval: true`
   - `message` for the approver task.
4. After reviewer approval, workflow sends `workflow.lesson_release.publish` with input:
   - `lessonId`
   - `approvedBy` (required)
   - `notes` (optional)
5. `handleWorkflowLessonReleasePublish` updates `Lessons.Status` to `active` and returns:
   - `status: completed`
   - `newStatus: active`
   - release confirmation `message`.

**Human approval points**
- Required between prepare and publish.
- Publish step must include `approvedBy`; otherwise action fails.

**Apps Script endpoint action keys**
- `workflow.lesson_release.prepare`
- `workflow.lesson_release.publish`

## 3) Content Review / Approval Flow

**Trigger point**
- Author/editor submits lesson for QA/editorial sign-off before release.

**Step-by-step inputs/outputs**
1. Trigger sends `workflow.content_review.submit` with input:
   - `lessonId` (required)
   - `reviewerUserId` (required)
   - `notes` (optional)
2. `handleWorkflowContentReviewSubmit` records review request event and returns:
   - `status: pending_approval`
   - `submissionId`
   - `requiresApproval: true`
3. Human reviewer approves in workflow UI/task step.
4. Workflow sends `workflow.content_review.approve` with input:
   - `lessonId`
   - `approvedBy` (required)
   - `notes` (optional)
5. `handleWorkflowContentReviewApprove` updates `Lessons.Status` to `approved` and returns:
   - `status: completed`
   - `newStatus: approved`
   - completion `message`.

**Human approval points**
- Required between submit and approve.
- Approve step requires explicit `approvedBy` actor.

**Apps Script endpoint action keys**
- `workflow.content_review.submit`
- `workflow.content_review.approve`

## Slash Commands Are Thin Triggers (Not Orchestration)

Slash commands should only start workflows or provide user shortcuts. They should not own multi-step orchestration logic.

- `/onboard` acts as a trigger for `workflow.onboarding.start`.
- Multi-step orchestration, state transitions, and approval enforcement stay in workflow action handlers.
- This keeps command latency low and centralizes automation logic in workflow-specific handlers.
