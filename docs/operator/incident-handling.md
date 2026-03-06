# Incident Handling

This document defines the current incident response flow for LMS operations.

## Severity model

- **SEV-1**: Broad outage (Slack commands or webhooks non-functional).
- **SEV-2**: Core feature degraded (submission, progression, or scheduled jobs failing).
- **SEV-3**: Non-critical issue (intermittent retries, delayed reports).

## Response workflow

1. Triage the failure signal (Slack error, execution failure, missing Sheets updates).
2. Assign incident lead and severity.
3. Stabilize service:
   - Roll back latest risky config/deployment change.
   - Re-run failed scheduler jobs if safe.
4. Verify recovery using command and Sheets write checks.
5. Record timeline, root cause, and follow-up actions.

## Standard checks during incident

- Verify endpoint deployment URL and access mode.
- Validate signature/token settings in Script Properties.
- Inspect Apps Script Executions for stack traces and timeouts.
- Confirm idempotency protections prevented duplicate writes.

## Post-incident

- Add a remediation item to backlog.
- Update affected operator runbook page.
- Communicate closure summary to stakeholders.
