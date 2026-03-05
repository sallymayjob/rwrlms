# Deployment

## 1) Create Google Sheets Database

- Create spreadsheet: `RWR_LMS_DATABASE`
- Create tabs:
  `Courses`, `Months`, `Lessons`, `Learners`, `Submissions`, `Logs`, `Dashboard`
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

## 6) Configure Slash Commands

- Confirm each command points to the same Apps Script endpoint.
- Reinstall app if scopes or commands changed.

## 7) Validate End-to-End

Run:

- `/onboard`
- `/courses`
- `/enroll C001`
- `/learn`
- `/submit M03-W02-L04 complete`
- `/progress`

## 8) Configure Scheduler Triggers

In Apps Script Triggers:

- `sendDailyLesson` → time-driven → daily
- `weeklyLeaderboard` → time-driven → weekly
- `progressReport` → time-driven → weekly

## Troubleshooting

- 401/invalid signature: verify signing secret and timestamp handling.
- Empty responses: check script execution logs and `Logs` tab.
- Missing lessons: validate CSV headers and `LESSON_CSV_FILE_ID`.
