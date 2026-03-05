# Slack LMS (Serverless)

A production-ready, serverless Learning Management System (LMS) that delivers micro-lessons inside Slack using:

- **Slack App + Slash Commands**
- **Google Apps Script Web App**
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

## Repository Structure

```text
slack-lms/
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
│   └── dashboard-template.csv
├── sheets/
│   ├── create-database.md
│   └── import-csv.md
├── apps-script/
│   ├── Code.gs
│   ├── router.gs
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
│   └── config.gs
└── docs/
    ├── launch-guide.md
    ├── system-architecture.md
    ├── workflow.md
    └── deployment.md
```

## Quick Start

1. Create a Google Sheet named `RWR_LMS_DATABASE` with tabs:
   `Courses`, `Modules`, `Lessons`, `Learners`, `Submissions`, `Logs`, `Dashboard` (recommended).
2. Import CSV templates from `database/`, including `dashboard-template.csv` into the `Dashboard` tab.
3. Create an Apps Script project bound to the sheet and paste files from `apps-script/`.
4. Set Script Properties:
   - `SLACK_SIGNING_SECRET`
   - `SLACK_VERIFICATION_TOKEN`
   - `SLACK_BOT_TOKEN`
   - `SPREADSHEET_ID`
   - `LESSON_CSV_FILE_ID` (optional for imports)
5. Deploy Apps Script as a Web App (`Anyone` access for Slack requests).
6. Create Slack App using `slack/slack-app-manifest.yaml`.
7. Point all slash commands to:
   `https://script.google.com/macros/s/DEPLOYMENT_ID/exec`


## Supervisor Routing (No n8n)

This repository implements the Slack supervisor/router directly in Apps Script (`doPost`) and does **not** use n8n workflows.
Supported inbound Slack payloads:

- Slash commands
- Events API URL verification (`challenge`)
- Interactive payload envelope acknowledgement

See `docs/supervisor-router.md` for routing details.

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

- The backend verifies Slack signatures and timestamp drift.
- All mutating actions are logged to the `Logs` sheet.
- Command responses are immediate and optimized for Slack UX.
- Scheduled jobs can run daily/weekly from Apps Script triggers.

## License

Internal / proprietary template for rapid deployment.
