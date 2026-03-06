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


### 5a) Configure Agents & AI Apps (Optional, UI-only)

If you enable **Agent or Assistant** in Slack (as shown in your screenshot), add the following in the Slack app admin UI:

1. Go to **Agents & AI Apps** in your app settings.
2. Toggle **Agent or Assistant** to ON.
3. In **Agent or Assistant Overview**, enter a short summary of what the assistant can/can't do.
4. In **Suggested Prompts**, choose:
   - **Fixed**: up to 4 hardcoded prompts, or
   - **Dynamic**: provide prompts from your API endpoint.
5. Click **Save**, then reinstall/update the app in your workspace if prompted.

Recommended starter overview for this project:

- “Agentic LMS helps learners discover courses, enroll, fetch next lessons, submit completions, and check progress/certification. It cannot modify Slack workspace settings or access data outside configured LMS sheets.”

Recommended fixed prompts (example):

- “Show my available courses”
- “Enroll me in C001”
- “Give me my next lesson”
- “Show my progress and certification status”

> Note: These **Agents & AI Apps** settings are configured from Slack's UI and are not currently managed in this repository's manifest file.

## 6) Configure Slash Commands and Workflow Trigger Events

- Confirm each slash command points to the same Apps Script endpoint.
- Workflow Steps in app manifests are deprecated; do not configure `features.workflow_steps`.
- Add `workflow_step_execute` to **Event Subscriptions → Bot Events** so workflow step executions are delivered to your Apps Script endpoint.
- Enable the global shortcut `lms_workflow_start` to launch learner-triggered workflow runs from Slack.
- Keep workflow callback request targets on the same web app endpoint used for slash commands/interactivity.
- Reinstall app if scopes, bot events, or commands changed.
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

## 9) Trigger Provisioning Matrix (Explicit)

Use this matrix when provisioning triggers in **Apps Script → Triggers** so each trigger type is configured intentionally.

| Trigger type | Function name | Provisioning steps | Expected payload schema |
| --- | --- | --- | --- |
| Time-driven | `sendDailyLesson` | Add Trigger → choose `sendDailyLesson` → Event source: **Time-driven** → select day + hour window. | `{}` (no event payload used; function loads learners from Sheets). |
| Time-driven | `weeklyLeaderboard` | Add Trigger → choose `weeklyLeaderboard` → Event source: **Time-driven** → weekly cadence. | `{}` (no event payload used; function reads leaderboard data from Sheets). |
| Time-driven | `progressReport` | Add Trigger → choose `progressReport` → Event source: **Time-driven** → weekly cadence. | `{}` (no event payload used; function computes aggregate metrics from Sheets). |
| Webhook (Slack) | `doPost(e)` | Deploy as Web App, then set Slack slash command / event / interactive endpoints to the deployment URL. | `e.postData.contents` body parsed by `parseSlackRequestEnvelope`: JSON for Events API (`{ type, event, ... }`) or form-encoded slash command payload (`{ command, text, user_id, channel_id, trigger_id, response_url, ... }`) or interactive wrapper (`payload=<JSON>` where JSON contains `{ type, user, actions, ... }`). |
| onEdit/onChange installable | _Not currently used in this repo_ | No provisioning required unless you add handlers. If you add `onEdit(e)` or `onChange(e)`, create **Installable** triggers (Event source: Spreadsheet) instead of relying on simple triggers for production logging/permissions. | For future `onEdit(e)`: Spreadsheet edit event object (`range`, `source`, `value`, `oldValue`, ...). For future `onChange(e)`: change event object (`changeType`, `source`, ...). |

### 10) Operational Guardrails for Trigger Reliability

- **Retries**
  - Webhook retries are initiated by Slack when acknowledgements are late or non-2xx. Keep webhook handlers fast and return an acknowledgement payload promptly.
  - Time-driven trigger retries are managed by Apps Script runtime; monitor executions and set up alerting for repeated failures.
- **Idempotency keys**
  - For webhook processing, persist an idempotency key in `Logs` (or a dedicated sheet) before side effects. Recommended key precedence:
    1. `event_id` (Events API)
    2. `trigger_id` (interactive or slash flow)
    3. deterministic fallback hash of `rawBody + timestamp`
  - For scheduled jobs, use a deterministic run key like `jobName + yyyy-mm-dd` (daily) or `jobName + yyyy-ww` (weekly).
- **Duplicate-trigger protection**
  - Before writes/messages, check whether the idempotency key already exists and short-circuit duplicates.
  - For learner nudges, guard with `(UserID, LessonID, DateBucket)` uniqueness so duplicate scheduler invocations do not double-send.
  - Log duplicate rejections explicitly (for example `DUPLICATE_TRIGGER_SKIPPED`) for auditability.

### 11) Trigger Verification Checklist

Run this checklist after trigger provisioning changes:

1. **Trigger button/config verification**: In Apps Script Triggers, confirm each configured trigger exists with the expected source + cadence and no duplicate rows.
2. **Workflow start verification**: Fire a test webhook (`/learn` or `/progress`) and manually run one scheduled function from Apps Script editor; verify a new execution appears in Executions.
3. **Sheets duplex I/O verification**:
   - Read path: function execution loaded expected rows from `Learners`/`Courses`/`Lessons`.
   - Write path: a corresponding update/log row appears in `Submissions`, `Logs`, or target tab.
4. **Completion log verification**: confirm terminal success entries exist in `Logs` with timestamp, function/job name, and outcome (`ok` vs `error`).
5. **Duplicate protection verification**: replay the same webhook payload (or rerun a job inside the same run window) and confirm duplicate is skipped instead of re-writing/re-sending.

## Troubleshooting

- 401/invalid signature: verify signing secret and timestamp handling.
- Empty responses: check script execution logs and `Logs` tab.
- Missing lessons: validate CSV headers and `LESSON_CSV_FILE_ID`.
