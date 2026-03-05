# Architecture

## System Topology

```text
RWR LMS Composer
  └─ exports CSV (Courses, Modules, Lessons)
      └─ uploaded to Google Sheets / Drive
          └─ Google Apps Script Web App
              └─ Slack Slash Commands + Bot Messages
```

## Components

1. **Slack Layer**
   - Receives user slash commands.
   - Forwards payload to Apps Script endpoint.
   - Displays ephemeral responses and bot-delivered content.

2. **Apps Script API Layer**
   - `doPost(e)` entrypoint.
   - Signature verification and payload parsing.
   - Router dispatch to command agents.

3. **Data Layer (Google Sheets)**
   - `Courses`, `Modules`, `Lessons`, `Learners`, `Submissions`, `Logs`.
   - Read/write through utility wrappers for consistency.

4. **Drive Import Layer**
   - Pulls CSV file from Drive.
   - Parses and replaces Lessons records.

5. **Automation Layer**
   - Daily lesson nudges.
   - Weekly leaderboard summary.
   - Scheduled progress reports.

## Reliability Patterns

- Timestamp replay protection (`±5 min`).
- Deterministic IDs for submissions and logs.
- Centralized error handling + logging wrappers.
- Idempotent learner creation on `/onboard`.

## Security Model

- Shared-secret signature validation (`X-Slack-Signature`).
- Reject stale requests.
- Bot token retained in Script Properties.
- Do not store secrets in source code.

## Data Flow: `/learn`

1. Slack sends slash command payload.
2. Apps Script validates request and resolves `user_id`.
3. Learner record retrieved from `Learners`.
4. Next lesson identified from `Lessons` by `CurrentModule` or progression logic.
5. Slack-formatted lesson content returned.
6. Logs appended for observability.
