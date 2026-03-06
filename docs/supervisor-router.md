# Supervisor Router in Apps Script

This LMS uses Apps Script `doPost(e)` as the workflow IO router behind Slack Workflow Builder.

## Orchestration Context

The router operates inside the canonical sequence:

1. `learner_event` or `database_event` trigger fires.
2. Slack Workflow Builder starts workflow step(s).
3. Workflow invokes Apps Script endpoint.
4. Apps Script executes Google Sheets read/write and returns status/output.

## Routing Behavior

1. Parse inbound workflow payload envelope (`application/json` or form-encoded).
2. Verify request authenticity/freshness (signature/token depending on available headers).
3. Route by action key:
   - `workflow.query`: read operations and computed lookup responses.
   - `workflow.write`: mutation operations plus audit logging.
   - `workflow.health`: lightweight status check.
4. Return structured JSON payload to Slack Workflow Builder step response.

## Entrypoints and Trigger Names

- **Trigger names**: `learner_event`, `database_event`
- **Apps Script entrypoint**: `doPost(e)`
- **Action dispatch keys**: `workflow.query`, `workflow.write`, `workflow.health`

These names should remain consistent with `architecture.md`, `docs/system-architecture.md`, and `docs/workflow.md`.

## Security Notes

Store these in Script Properties:

- `SLACK_SIGNING_SECRET`
- `SLACK_VERIFICATION_TOKEN`
- `SLACK_BOT_TOKEN`
- `SPREADSHEET_ID`
