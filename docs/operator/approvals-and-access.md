# Approvals and Access

Defines who can approve and execute operational changes.

## Change approval levels

- **Low risk**: Trigger schedule adjustment, non-breaking content refresh.
  - Requires one operator approval.
- **Medium risk**: Script property updates, Slack app scope changes, deployment refresh.
  - Requires operator + reviewer approval.
- **High risk**: Endpoint changes, schema changes, or migration cutover steps.
  - Requires operator + reviewer + migration owner approval.

## Access boundaries

- Script Properties are restricted to deployment maintainers.
- Slack app admin changes are restricted to workspace app admins.
- Spreadsheet schema edits are restricted to data owners and migration owner.

## Approval record

For each approved change, capture:

1. Request summary.
2. Risk class (low/medium/high).
3. Approvers and timestamp.
4. Rollback plan.
