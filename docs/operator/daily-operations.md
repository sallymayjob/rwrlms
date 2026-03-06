# Daily Operations

This page is the current runbook for routine LMS operations.

## Daily checks

1. Confirm Apps Script executions are healthy (no recurring failures in `doPost`, `sendDailyLesson`, `weeklyLeaderboard`, `progressReport`).
2. Verify Slack command responsiveness with a quick `/learn` smoke test.
3. Confirm expected writes are landing in Sheets (`Submissions`, `Logs`, and learner progression fields).

## Weekly checks

1. Validate leaderboard and progress report jobs completed on schedule.
2. Spot-check learner progression for one active course.
3. Review duplicate-suppressed log entries to ensure idempotency protections are active.

## Operational SLOs

- Acknowledge webhook incidents within 15 minutes.
- Restore scheduler jobs within the same reporting window.
- Record all mitigation actions in `Logs`.

## Related current docs

- [Approvals and Access](./approvals-and-access.md)
- [CSV Import Operations](./csv-import.md)
- [Incident Handling](./incident-handling.md)
- [Source of Truth Architecture](../source-of-truth-architecture.md)
