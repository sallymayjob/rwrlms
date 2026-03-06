# Slack LMS (Serverless)

A production-ready, serverless Learning Management System (LMS) that delivers micro-lessons inside Slack using:

- **Slack App + Slash Commands**
- **Google Apps Script Web App**
- **Slack workflow-triggered actions** for onboarding/content workflows
- **Google Sheets** as the operational database
- **Google Drive** for CSV lesson import

No external servers, containers, or databases are required.

## Features

- Learner onboarding and enrollment
- Lesson delivery with continuity-aware progression
- Submission tracking and progress updates
- Course catalog and skill-gap summaries
- Certificate eligibility checks
- Scheduled nudges and reports
- Centralized audit and error logging
- CSV import pipeline for Composer-generated content
- Human approval gates for lesson release/content review workflows

## Repository Structure

```text
rwrlms/
├── README.md
├── architecture.md
├── slack/
│   ├── slack-app-manifest.yaml
│   └── slash-commands.json
├── database/
│   ├── courses-template.csv
│   ├── modules-template.csv
│   ├── lessons-template.csv
│   ├── learners-template.csv
│   ├── submissions-template.csv
│   ├── months-template.csv
│   └── dashboard-template.csv
├── sheets/
│   ├── create-database.md
│   └── import-csv.md
├── apps-script/
│   ├── Code.gs
│   ├── router.gs
│   ├── workflow.gs
│   ├── database.gs
│   ├── lessons.gs
│   ├── learners.gs
│   ├── submissions.gs
│   ├── slack.gs
│   ├── security.gs
│   ├── utils.gs
│   ├── scheduler.gs
│   ├── csvImport.gs
│   ├── logging.gs
│   ├── config.gs
│   └── agents/
└── docs/
    ├── source-of-truth-architecture.md
    ├── system-architecture.md
    ├── supervisor-router.md
    ├── workflow.md
    ├── deployment.md
    └── operator/
```

## Architecture (Current)

The supported runtime path is:

1. Slack command/event/workflow call reaches Apps Script `doPost(e)`.
2. Apps Script identifies request kind (`slash_command`, `workflow_trigger`, `interactive`, `event`).
3. Verified requests are routed by command or workflow action key.
4. Business handlers read/write Google Sheets.
5. Response payload is returned to Slack.

### Routing model in code

- `apps-script/Code.gs`
  - Main entrypoint: `doPost(e)`
  - Fast path for Slack URL verification challenge
  - Signature verification for slash/interactive/event payloads
- `apps-script/router.gs`
  - Slash command dispatcher (`/onboard`, `/learn`, `/submit`, etc.)
  - Workflow action dispatcher (`workflow.onboarding.start`, `workflow.lesson_release.prepare`, `workflow.content_review.approve`, `workflow.health`, ...)
- `apps-script/workflow.gs`
  - Workflow payload validation + action handlers

For canonical diagrams and deeper architecture docs, use:

- `architecture.md`
- `docs/source-of-truth-architecture.md`
- `docs/system-architecture.md`
- `docs/workflow.md`
- `docs/supervisor-router.md`

## Deployment (Current)

Use this order for active deployments:

1. **Provision data store**
   - Create Google Sheet `RWR_LMS_DATABASE`.
   - Ensure tabs: `Courses`, `Modules`, `Lessons`, `Learners`, `Submissions`, `Logs` (`Dashboard` optional).
   - Import CSV templates from `database/`.
2. **Publish Apps Script**
   - Create/bind Apps Script project and copy `apps-script/*` files.
   - Configure Script Properties:
     - `SLACK_SIGNING_SECRET`
     - `SLACK_VERIFICATION_TOKEN`
     - `SLACK_BOT_TOKEN`
     - `SPREADSHEET_ID`
     - `LESSON_CSV_FILE_ID` (optional)
     - `LESSON_CSV_APPROVED_FILE_ID` (optional, review flow)
   - Deploy as Web App and capture `/exec` URL.
3. **Configure Slack app**
   - Apply `slack/slack-app-manifest.yaml`.
   - Register slash commands from `slack/slash-commands.json` to the Apps Script `/exec` URL.
   - Set Events Request URL to the same endpoint if Events API is enabled.
4. **Enable workflow-driven operations (recommended)**
   - Connect Slack Workflow Builder steps to the same Apps Script endpoint.
   - Use workflow actions supported in `apps-script/router.gs` and `apps-script/workflow.gs`.
5. **Operationalize**
   - Set Apps Script time-driven triggers for scheduled jobs.
   - Use operator runbooks for approvals/imports/incidents.

### Deployment docs map

- Primary deployment doc: `docs/deployment.md`
- Operator runbooks:
  - `docs/operator/daily-operations.md`
  - `docs/operator/approvals-and-access.md`
  - `docs/operator/csv-import.md`
  - `docs/operator/incident-handling.md`
- Historical reference only: `docs/archive/deployment-legacy.md`

## Supported Slash Commands

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

## Operational Notes

- The backend verifies Slack signatures and timestamp drift where applicable.
- URL verification (`challenge`) is handled with a fast-path response.
- All mutating actions are logged to the `Logs` sheet.
- Scheduled jobs can run daily/weekly from Apps Script triggers.

## License

Internal / proprietary template for rapid deployment.
