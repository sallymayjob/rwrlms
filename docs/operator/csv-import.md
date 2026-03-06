# CSV Import Operations

Operational guidance for production CSV usage and lesson content refresh via Drive ingestion.

## Canonical Production CSV Tables and Sheet Names

- `courses-template.csv` → `Courses`
- `modules-template.csv` → `Modules`
- `lessons-template.csv` → `Lessons`
- `learners-template.csv` → `Learners`
- `submissions-template.csv` → `Submissions`
- `months-template.csv` → `Months` (optional)
- `dashboard-template.csv` → `Dashboard` (optional)
- Runtime-managed: `Logs` (created by Apps Script)

## Required vs Optional Fields (Operator Summary)

- **Courses**
  - Required: `CourseID`, `CourseTitle`, `MonthIDs`, `TotalMonths`, `TotalLessons`, `PublishedLessons`, `CompletionRate`, `AvgQAScore`, `Status`
  - Optional: `Description`, `DifficultyRange`, `LastUpdated`
- **Modules**
  - Required: `ModuleID`, `ModuleTitle`, `CourseID`, `ModuleNumber`, `WeekIDs`, `LessonIDs`, `TotalLessons`, `PublishedLessons`, `DraftLessons`, `NeedsRevision`, `AvgQAScore`, `QA_PassRate`, `Status`
  - Optional: `ThemeDescription`, `DifficultyTier`, `LastUpdated`
- **Lessons**
  - Required: `LessonID`, `Title`, `Module`, `Status`, `Hook`, `CoreContent`, `Takeaway`, `Mission`
  - Optional: all remaining template columns
- **Learners**
  - Required: `UserID`, `Name`, `Status`
  - Optional: `Email`, `CourseID`, `CurrentModule`, `Progress`, `JoinedDate`
- **Submissions**
  - Required: `SubmissionID`, `UserID`, `LessonID`, `Timestamp`, `Status`
  - Optional: `Score`, `Method`
- **Months**
  - Required: `MonthID`, `CourseID`, `MonthName`, `Status`
  - Optional: `Description`
- **Dashboard**
  - Required: `Metric`, `Value`
  - Optional: `Description`, `LastUpdated`

## Header Normalization and Lookup Behavior

- CSV import path normalizes header whitespace before validation.
- Validation uses header names, not positional order.
- Logging appends use header normalization/token lookup in `Logs`, so writes are order-independent relative to provided object keys.

## Lesson ID Validation Behavior

Canonical format is strict: `M##-W##-L##`.

- Accepted: `M03-W02-L04`
- Rejected suffix variants: `M03-W02-L04A`, `M03-W02-L04-v2`, `M03-W02-L04_01`, `M03-W02-L04:alt`

This affects lessons CSV validation and parser paths for workflow + submissions.

## Preconditions

- `LESSON_CSV_FILE_ID` exists in Script Properties.
- CSV headers match expected lesson schema.
- Import occurs during low-traffic window when possible.

## Runbook

1. Upload/replace lesson CSV in Google Drive.
2. Confirm file ID matches `LESSON_CSV_FILE_ID`.
3. Run `validateLessonsCSVForReview()`.
4. Confirm report has `canImport: true` and no errors.
5. Acquire explicit human sign-off.
6. Run `approveLessonsCSVImport('reviewer@company.com')`.
7. Run `importLessonsCSV()`.
8. Validate row counts and sample lessons in `Lessons` tab.
9. Run a `/learn` smoke test to verify retrieval integrity.

## Migration Notes for Deprecated Fields

Map deprecated fields before import:

- `CourseID` → `EnrollmentCourseID`
- `CurrentModule` → `ActiveModuleID`
- `Progress` → `CompletionPercent`
- `UserID` → `SlackUserID`
- `CoreContent` → `Explanation`
- `Mission` → `PracticeTask`

## Failure handling

- On schema mismatch: stop import and restore prior CSV.
- On partial write: revert using backup sheet snapshot and rerun import.
- Log all import failures with reason and remediation owner.
