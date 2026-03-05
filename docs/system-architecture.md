# System Architecture

## Design Principles

- **Serverless-first**: no external runtime dependencies.
- **Operational transparency**: sheet-based logs and deterministic writes.
- **Modularity**: routing, data access, security, and command handlers are isolated.
- **Composable content**: lessons authored externally and imported via CSV.

## Module Map

- `Code.gs`: web entry points.
- `router.gs`: slash command dispatcher.
- `security.gs`: request verification.
- `database.gs`: sheet CRUD wrapper.
- `learners.gs`: onboarding/enrollment/progress.
- `lessons.gs`: lesson retrieval and formatting.
- `submissions.gs`: submission + completion lifecycle.
- `scheduler.gs`: timed jobs.
- `csvImport.gs`: Drive CSV ingestion.
- `logging.gs`: centralized logs.
- `slack.gs`: Slack response + outbound API.

## Data Contracts

### Lessons
Core fields include pedagogical narrative sections (`Hook`, `CoreContent`, `Insight`, `Mission`) and operational metadata (`Status`, `Difficulty`, `WordCount`, `BrandComplianceScore`).

### Learners
Tracks learner assignment (`CourseID`), pacing (`CurrentLesson`), and lifecycle (`Status`).

### Submissions
Event log of learning interactions; used for scoring and progress update.

## Trust Boundaries

1. Slack request signed with workspace secret.
2. Apps Script verifies freshness and HMAC.
3. Only validated requests enter routing pipeline.
4. Mutations are persisted to Sheets and logged.
