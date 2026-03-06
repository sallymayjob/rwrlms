# Workflow

## Canonical Event-to-IO Flow

The platform uses this sequence for all automated learner/data operations:

1. `learner_event` or `database_event` fires.
2. Slack Workflow Builder starts workflow step(s).
3. Workflow calls Apps Script `doPost(e)`.
4. Apps Script performs Google Sheets duplex read/write.
5. Apps Script returns status/output to the workflow.

See `architecture.md` for the canonical data-flow diagram.

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
- CSV refresh for Gemini content now follows gated sequence: `validateLessonsCSVForReview()` → human review post/approval via `approveLessonsCSVImport(...)` → `importLessonsCSV()`.
