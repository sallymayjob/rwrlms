# Architecture

## System Topology

```text
Learner + Data Operations in LMS
  └─ emits trigger events (`learner_event`, `database_event`)
      └─ Slack Workflow Builder starts workflow step(s)
          └─ Workflow calls Apps Script Web App endpoint(s)
              └─ Apps Script reads/writes Google Sheets and returns status/output
```

## Canonical Data-Flow Diagram

```mermaid
flowchart LR
    A[Learner/DB event trigger\n`learner_event` | `database_event`] --> B[Slack Workflow Builder\nworkflow step runner]
    B --> C[Apps Script Web App\nentrypoint: `doPost(e)`]
    C --> D[(Google Sheets\nDuplex Read/Write)]
    D --> C
    C --> E[Workflow status/output\n(step response + logs)]
```

This is the canonical orchestration sequence used across the docs set.

## Components

1. **Trigger Layer (Learner + DB Events)**
   - Emits `learner_event` and `database_event` when user activity or sheet state changes require processing.

2. **Slack Workflow Builder Layer**
   - Hosts the workflow definitions and runs step sequences.
   - Invokes Apps Script endpoint(s) for query/IO operations.

3. **Apps Script API Layer**
   - `doPost(e)` entrypoint for workflow calls.
   - Parses workflow payloads and dispatches action handlers (`workflow.query`, `workflow.write`).
   - Returns status/output payloads back to Slack Workflow Builder.

4. **Data Layer (Google Sheets)**
   - `Courses`, `Modules`, `Lessons`, `Learners`, `Submissions`, `Logs`.
   - Duplex read/write through utility wrappers for consistency.

5. **Drive Import Layer**
   - Pulls CSV file from Drive.
   - Parses and replaces Lessons records.

6. **Automation Layer**
   - Daily lesson nudges.
   - Weekly leaderboard summary.
   - Scheduled progress reports.

## Reliability Patterns

- Timestamp replay protection (`±5 min`) where Slack signatures are available.
- Deterministic IDs for submissions and logs.
- Centralized error handling + logging wrappers.
- Idempotent learner creation during onboarding actions.

## Security Model

- Shared-secret signature validation (`X-Slack-Signature`) where headers are accessible.
- Reject stale requests.
- Bot token retained in Script Properties.
- Do not store secrets in source code.

## Workflow Invocation Contract

1. `learner_event` or `database_event` fires.
2. Slack Workflow Builder starts configured workflow step(s).
3. Workflow calls Apps Script `doPost(e)` endpoint with action payload (`workflow.query` or `workflow.write`).
4. Apps Script executes Google Sheets read/write.
5. Apps Script returns structured status/output to workflow step.
