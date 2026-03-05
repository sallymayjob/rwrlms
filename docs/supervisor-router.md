# Supervisor Router in Apps Script (n8n-free)

This LMS uses a single Apps Script `doPost(e)` endpoint as the supervisor router.

## Why

- Keeps the platform fully serverless within Google Apps Script + Sheets.
- Avoids external orchestration layers (including n8n).
- Preserves Slack command responsiveness and security checks.

## Routing Behavior

1. Parse inbound payload envelope from either:
   - `application/x-www-form-urlencoded`
   - `application/json`
2. Verify request:
   - Prefer Slack signature + timestamp verification when headers are available.
   - Fallback to verification token check when Apps Script hides headers.
3. Route by payload type:
   - `type=url_verification` + `challenge`: return challenge JSON.
   - `command`: dispatch to command router (`/onboard`, `/learn`, etc.).
   - `payload` (interactive): acknowledge and log.
   - `event`: acknowledge and log.

## Command Surface

- `/onboard`
- `/enroll`
- `/progress`
- `/learn`
- `/submit`
- `/cert`
- `/report`
- `/gaps`
- `/courses`
- `/help`
- `/unenroll`

## Security Notes

Store these in Script Properties:

- `SLACK_SIGNING_SECRET`
- `SLACK_VERIFICATION_TOKEN`
- `SLACK_BOT_TOKEN`
- `SPREADSHEET_ID`
