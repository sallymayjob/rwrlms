# Workflow

## Canonical Event-to-IO Flow

The platform uses this sequence for all automated learner/data operations:

1. `learner_event` or `database_event` fires.
2. Slack Workflow Builder starts workflow step(s).
3. Workflow calls Apps Script `doPost(e)`.
4. Apps Script performs Google Sheets duplex read/write.
5. Apps Script returns status/output to the workflow.

See `architecture.md` for the canonical data-flow diagram.

## Workflow Action Contract (Policy-Enforced)

`validateWorkflowTriggerPayload(payload)` accepts only a bounded action/sheet policy and rejects everything else.

### Required request shape

```json
{
  "type": "workflow_trigger",
  "action": "select | insert | update",
  "sheetName": "<allowed sheet>",
  "query": {
    "fieldName": "optional for select, required for update",
    "fieldValue": "optional"
  },
  "input": {
    "<field>": "<value>"
  },
  "output": {}
}
```

### Allowed actions

- `select`
- `insert`
- `update`

### Allowed target sheets per action

- `select`: `Learners`, `Submissions`, `Courses`, `Modules`, `Lessons`, `Logs`
- `insert`: `Learners`, `Submissions`, `Logs`
- `update`: `Learners`, `Submissions`

### Write field allowlist behavior

For write actions (`insert`, `update`), Apps Script enforces a field policy before touching Sheets:

- unknown/disallowed keys in `input` are dropped
- only configured fields are passed to `appendRow` / `updateRowByField`

Configured write field allowlists:

- `insert`
  - `Learners`: `UserID`, `Name`, `Email`, `CourseID`, `CurrentModule`, `Progress`, `Status`, `JoinedDate`
  - `Submissions`: `SubmissionID`, `UserID`, `LessonID`, `Timestamp`, `Score`, `Status`, `Method`
  - `Logs`: `Timestamp`, `Level`, `EventType`, `UserID`, `Command`, `Message`, `ContextJSON`
- `update`
  - `Learners`: `CourseID`, `CurrentModule`, `Progress`, `Status`, `Name`, `Email`
  - `Submissions`: `Score`, `Status`, `Method`

### Policy violations

Blocked action/sheet combinations are rejected during validation and logged as workflow failures with reason `policy_violation`.

## Learner Journey (Logical)

1. Learner action or state change emits `learner_event`.
2. Workflow step requests learner/course state via `workflow.query`.
3. Apps Script reads `Learners`, `Courses`, `Modules`, `Lessons`.
4. Workflow determines next action and may issue `workflow.write`.
5. Apps Script writes updates (for example to `Submissions`, `Learners`, `Logs`) and returns completion status.

## Submission Progression Flow

```text
learner_event (submission)
  -> Slack Workflow Builder step sequence
  -> Apps Script doPost(e): workflow.query (validate lesson + learner state)
  -> Apps Script doPost(e): workflow.write (append Submissions, update Learners)
  -> status/output returned to workflow
```

## Admin / Ops Flow

- Report and progress operations can emit `database_event` after batch updates.
- Scheduled triggers still support:
  - `sendDailyLesson()`
  - `weeklyLeaderboard()`
  - `progressReport()`
- CSV refresh via `importLessonsCSV()` for content updates.
