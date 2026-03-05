# Create Google Sheets Database

## Spreadsheet

Create a spreadsheet named **RWR_LMS_DATABASE**.

## Required Tabs

1. `Courses`
2. `Months`
3. `Lessons`
4. `Learners`
5. `Submissions`
6. `Logs`

## Header Row Requirements

- Paste header rows exactly from the CSV templates in `database/`.
- Keep header row on row 1 for all tabs.
- Freeze row 1 for usability.

## Suggested Data Validation

- `Status` fields: `active`, `inactive`, `paused`, `completed`
- `Progress` range: `0` to `100`
- `LessonID` regex: `M\d{2}-W\d{2}-L\d{2}`

## Logs Tab Headers

Use this header row for `Logs`:

```csv
Timestamp,Level,EventType,UserID,Command,Message,ContextJSON
```
