# System Architecture

## Design Principles

- **Serverless-first**: Apps Script + Google Sheets with Slack Workflow Builder orchestration.
- **Operational transparency**: sheet-based logs and deterministic writes.
- **Modularity**: workflow triggers, routing, data access, security, and handlers are isolated.
- **Composable content**: lessons authored externally and imported via CSV.

## Canonical Orchestration Sequence

Use the same flow and names defined in `architecture.md`:

1. Trigger fires: `learner_event` or `database_event`.
2. Slack Workflow Builder starts workflow step(s).
3. Workflow invokes Apps Script `doPost(e)` endpoint.
4. Apps Script performs Google Sheets duplex read/write.
5. Apps Script returns status/output to workflow.

## Module Map

- `Code.gs`: web entry points (`doPost(e)`).
- `router.gs`: workflow action dispatcher (`workflow.query`, `workflow.write`).
- `security.gs`: request verification.
- `database.gs`: sheet CRUD wrapper.
- `learners.gs`: onboarding/enrollment/progress.
- `lessons.gs`: lesson retrieval and formatting.
- `submissions.gs`: submission + completion lifecycle.
- `scheduler.gs`: timed jobs.
- `csvImport.gs`: Drive CSV ingestion.
- `logging.gs`: centralized logs.
- `slack.gs`: workflow response + outbound API.

## Data Contracts

### Lessons
Core fields include pedagogical narrative sections (`Hook`, `CoreContent`, `Insight`, `Mission`) and operational metadata (`Status`, `Difficulty`, `WordCount`, `BrandComplianceScore`).

### Learners
Tracks learner assignment (`CourseID`), pacing (`CurrentModule`), and lifecycle (`Status`).

### Submissions
Event log of learning interactions; used for scoring and progress update.

## Trust Boundaries

1. Slack workflow request is authenticated.
2. Apps Script verifies request freshness/signature/token as available.
3. Only validated requests enter routing pipeline.
4. Mutations are persisted to Sheets and logged.
