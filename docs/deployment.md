# Deployment

## 1) Create Google Sheets Database

- Create spreadsheet: `RWR_LMS_DATABASE`
- Create tabs:
  `Courses`, `Modules`, `Lessons`, `Learners`, `Submissions`, `Logs`, `Dashboard`
- Import corresponding CSV templates from `/database` (including `dashboard-template.csv` into the `Dashboard` tab).

## 2) Build Apps Script Project

1. Open Extensions → Apps Script from the spreadsheet.
2. Create script files matching `/apps-script` names.
3. Paste content for each module.

## 3) Configure Script Properties

In Apps Script: Project Settings → Script Properties.

Required:

- `SPREADSHEET_ID`
- `SLACK_SIGNING_SECRET`
- `SLACK_VERIFICATION_TOKEN`
- `SLACK_BOT_TOKEN`
- `LESSON_CSV_FILE_ID` (for CSV import)

Optional:

- `LEADERBOARD_CHANNEL_ID`

## 4) Deploy as Web App

1. Deploy → New deployment → Web app.
2. Execute as: `Me`
3. Who has access: `Anyone`
4. Copy deployed URL.

## 5) Create Slack App

1. Open Slack API app management.
2. Use `slack/slack-app-manifest.yaml` to create app.
3. Replace `DEPLOYMENT_ID` endpoint placeholders with deployed URL.
4. Install app to workspace.

## 6) Configure Slash Commands and Workflow Triggers

- Confirm each command points to the same Apps Script endpoint.
- In Slack app settings, configure Workflow Steps so `lms_fetch_lesson` and `lms_record_submission` execute via the Apps Script URL.
- Enable the global shortcut `lms_workflow_start` to launch learner-triggered workflow runs from Slack.
- Keep workflow callback request targets on the same web app endpoint used for slash commands/interactivity.
- Reinstall app if scopes, workflow steps, or commands changed.
- No n8n supervisor is required; Apps Script `doPost` handles slash/event/interactive/workflow routing.

## 7) Review OAuth Scopes for Workflow Execution

Ensure the manifest bot scopes include at minimum:

- `chat:write`
- `commands`
- `im:write`
- `workflow.steps:execute`
- `users:read`
- `app_mentions:read`

If scopes are changed after initial install, reinstall the Slack app so tokens include updated permissions.

## 8) Validate End-to-End

Run:

- `/onboard`
- `/courses`
- `/enroll C001`
- `/learn`
- `/submit M03-W02-L04 complete`
- `/progress`

## 9) Configure Scheduler Triggers

In Apps Script Triggers:

- `sendDailyLesson` → time-driven → daily
- `weeklyLeaderboard` → time-driven → weekly
- `progressReport` → time-driven → weekly

## Troubleshooting

- 401/invalid signature: verify signing secret and timestamp handling.
- Empty responses: check script execution logs and `Logs` tab.
- Missing lessons: validate CSV headers and `LESSON_CSV_FILE_ID`.
