# Create Google Sheets Database

## Spreadsheet

Create a spreadsheet named **RWR_LMS_DATABASE**.

## Canonical Tabs

Required:

1. `Courses`
2. `Modules`
3. `Lessons`
4. `Learners`
5. `Submissions`
6. `Logs`

Optional (production-recommended):

7. `Months`
8. `Dashboard`

## Canonical CSV Templates → Sheet Names

- `database/courses-template.csv` → `Courses`
- `database/modules-template.csv` → `Modules`
- `database/lessons-template.csv` → `Lessons`
- `database/learners-template.csv` → `Learners`
- `database/submissions-template.csv` → `Submissions`
- `database/months-template.csv` → `Months`
- `database/dashboard-template.csv` → `Dashboard`

`Logs` is runtime-managed and not loaded from `database/*.csv`.

## Header Row Requirements

- Paste header rows exactly from the CSV templates in `database/`.
- Keep header row on row 1 for all tabs.
- Freeze row 1 for usability.
- Do not rely on column position for Apps Script logging writes: log insertion resolves by normalized header name.

## Required vs Optional Fields by Production CSV

### `Courses` (`database/courses-template.csv`)

- Required: `CourseID`, `CourseTitle`, `MonthIDs`, `TotalMonths`, `TotalLessons`, `PublishedLessons`, `CompletionRate`, `AvgQAScore`, `Status`
- Optional: `Description`, `DifficultyRange`, `LastUpdated`

### `Modules` (`database/modules-template.csv`)

- Required: `ModuleID`, `ModuleTitle`, `CourseID`, `ModuleNumber`, `WeekIDs`, `LessonIDs`, `TotalLessons`, `PublishedLessons`, `DraftLessons`, `NeedsRevision`, `AvgQAScore`, `QA_PassRate`, `Status`
- Optional: `ThemeDescription`, `DifficultyTier`, `LastUpdated`

### `Lessons` (`database/lessons-template.csv`)

- Required: `LessonID`, `Title`, `Module`, `Status`, `Hook`, `CoreContent`, `Takeaway`, `Mission`
- Optional: `Week`, `Lesson`, `Type`, `Topic`, `Objective`, `Insight`, `Difficulty`, `TonePreset`, `WordCount`, `ToolsRequired`, `AlternativePath`, `ContinuityNotes`, `MediaRequired`, `MediaBrief`, `BrandComplianceScore`, `PEDFlags`, `GoldenExample`

### `Learners` (`database/learners-template.csv`)

- Required: `UserID`, `Name`, `Status`
- Optional: `Email`, `CourseID`, `CurrentModule`, `Progress`, `JoinedDate`

### `Submissions` (`database/submissions-template.csv`)

- Required: `SubmissionID`, `UserID`, `LessonID`, `Timestamp`, `Status`
- Optional: `Score`, `Method`

### `Months` (`database/months-template.csv`)

- Required: `MonthID`, `CourseID`, `MonthName`, `Status`
- Optional: `Description`

### `Dashboard` (`database/dashboard-template.csv`)

- Required: `Metric`, `Value`
- Optional: `Description`, `LastUpdated`

## Suggested Data Validation

- Status fields: `active`, `inactive`, `paused`, `completed` (and for lessons import path: `draft`, `archived`, `needs_revision`)
- `Progress` range: `0` to `100`
- `LessonID` canonical regex: `M\d{2}-W\d{2}-L\d{2}`
- Reject suffix variants in canonical lesson IDs (examples: `M03-W02-L04A`, `M03-W02-L04-v2`)

## Logs Tab Headers

Use this canonical header row for `Logs`:

```csv
Timestamp,Level,EventType,UserID,Command,Message,ContextJSON
```

`apps-script/logging.gs` will match headers in order-independent fashion using normalized header tokens.

## Deprecated Header Migration Notes

When backfilling older exports, map these deprecated headers to current names before load:

- `CourseID` → `EnrollmentCourseID`
- `CurrentModule` → `ActiveModuleID`
- `Progress` → `CompletionPercent`
- `UserID` → `SlackUserID`
- `CoreContent` → `Explanation`
- `Mission` → `PracticeTask`
