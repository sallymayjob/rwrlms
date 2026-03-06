# Source of Truth Architecture (Current)

This is the one-page entry point for the currently supported LMS architecture and operational docs.

## Supported architecture flow

1. Slack command/event/workflow call reaches Apps Script `doPost(e)`.
2. Request is verified using available signature/token data.
3. Router dispatches read/write actions.
4. Data is read from and written to Google Sheets.
5. Status/results are returned to Slack.

## Current supported documentation paths

### Architecture and flow

- `docs/source-of-truth-architecture.md` (this page)
- `docs/system-architecture.md`
- `docs/workflow.md`
- `docs/supervisor-router.md`

### Operator runbooks

- `docs/operator/daily-operations.md`
- `docs/operator/approvals-and-access.md`
- `docs/operator/csv-import.md`
- `docs/operator/incident-handling.md`

### Migration guidance

- `docs/migration/old-to-new-map.md`
- `docs/migration/phased-cutover.md`

## Deprecated/archived guidance

The following are historical context and not active source-of-truth:

- `docs/archive/deployment-legacy.md`
- `docs/archive/code-review-legacy.md`
- command-centric launch guidance in legacy documents
