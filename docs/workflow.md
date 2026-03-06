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

- Report and progress operations can emit `database_event` after batch updates.
- Scheduled triggers still support:
  - `sendDailyLesson()`
  - `weeklyLeaderboard()`
  - `progressReport()`
- CSV refresh for Gemini content now follows gated sequence: `validateLessonsCSVForReview()` → human review post/approval via `approveLessonsCSVImport(...)` → `importLessonsCSV()`.
