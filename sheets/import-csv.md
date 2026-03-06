# Import CSV Data

## Purpose

Use this runbook when ingesting AI-generated lesson CSV content into the `Lessons` sheet. The process is deterministic: imports are blocked unless the exact validated file is explicitly human-approved.

## Canonical Target

- CSV file: lesson export with canonical headers
- Target sheet: `Lessons`
- Runtime validator: `apps-script/csvImport.gs`

## Header Normalization and Order-Independent Lookup

- Parser normalizes header whitespace (trim + collapse repeated spaces).
- Header order is not semantically significant for validation; fields are read by header key.
- Logging writes are also order-independent (`apps-script/logging.gs`) and resolve by normalized header tokens.

## Required vs Optional Fields (`Lessons` CSV)

### Required headers (must exist)

- `LessonID`
- `Title`
- `Module`
- `Status`
- `Hook`
- `CoreContent`
- `Takeaway`
- `Mission`

### Optional headers (accepted but not required by validator)

- `Week`, `Lesson`, `Type`, `Topic`, `Objective`, `Insight`
- `Difficulty`, `TonePreset`, `WordCount`
- `ToolsRequired`, `AlternativePath`, `ContinuityNotes`
- `MediaRequired`, `MediaBrief`, `BrandComplianceScore`, `PEDFlags`, `GoldenExample`

## Row-level Rules Enforced by Validator

- `LessonID`
  - required
  - must match canonical regex `^M\d{2}-W\d{2}-L\d{2}$`
  - must be unique within the uploaded CSV
- Narrative fields (`Title`, `Hook`, `CoreContent`, `Takeaway`, `Mission`)
  - each is required and non-empty
- `Status`
  - required
  - must be one of: `active`, `draft`, `archived`, `needs_revision`
- `Module`
  - required
  - must exist in the `Modules` sheet (`ModuleID` linkage check)

## Lesson ID Validation / Parser Behavior (Including Suffix Variants)

Canonical ID format is strict (`M##-W##-L##`).

Accepted example:

- `M03-W02-L04`

Rejected suffix variants (examples):

- `M03-W02-L04A`
- `M03-W02-L04-v2`
- `M03-W02-L04_01`
- `M03-W02-L04:alt`

This same strictness applies to:

- CSV validator (`validateLessonsCsvRows`)
- Slash command submission parser (`/submit` flow)
- Workflow lesson release/review parser

## Deterministic Review Workflow (Required)

### 1) AI output uploaded

1. Upload the generated CSV to Google Drive.
2. Copy the file ID from the Drive URL.
3. Set Script Property `LESSON_CSV_FILE_ID` to that uploaded file ID.

### 2) Validator report posted

1. In Apps Script editor, run `validateLessonsCSVForReview()`.
2. Capture returned `report` JSON (especially `summary`, `errors`, `warnings`, `canImport`).
3. Post validator report in your team review channel/thread.

### 3) Human approval required before `replaceSheetData(...)`

1. A human reviewer confirms validator `canImport: true` and signs off.
2. Run `approveLessonsCSVImport('reviewer@company.com')` (or reviewer name).
3. Only after approval, run `importLessonsCSV()`.

> `importLessonsCSV()` is gated. It fails if:
>
> - the current `LESSON_CSV_FILE_ID` was not approved, or
> - file contents changed after approval (checksum mismatch).

## Migration Notes for Deprecated Fields

If your content pipeline still emits deprecated names, map before validation/import:

- `CoreContent` → `Explanation` (if migrating to rewritten narrative schema)
- `Mission` → `PracticeTask` (if migrating to rewritten narrative schema)
- `CourseID` → `EnrollmentCourseID`
- `CurrentModule` → `ActiveModuleID`
- `Progress` → `CompletionPercent`
- `UserID` → `SlackUserID`

For this repository’s current lessons validator, canonical required narrative headers remain `CoreContent` and `Mission`.

## Operator Checklist

- [ ] I uploaded the latest lesson CSV and set `LESSON_CSV_FILE_ID`.
- [ ] I ran `validateLessonsCSVForReview()`.
- [ ] Validator report has `canImport: true` and no errors.
- [ ] Validator report was posted for review.
- [ ] Human reviewer explicitly approved this exact file.
- [ ] I ran `approveLessonsCSVImport(...)`.
- [ ] I ran `importLessonsCSV()` and confirmed row count/log entry.

## Rollback Procedure

If bad data is imported:

1. Open `RWR_LMS_DATABASE` → `Lessons` tab.
2. Restore previous sheet state using version history:
   - **File → Version history → See version history**
   - Restore the last known-good version.
3. Clear stale approval metadata in Script Properties (to prevent accidental re-import):
   - `LESSON_CSV_APPROVED_FILE_ID`
   - `LESSON_CSV_APPROVED_CHECKSUM`
   - `LESSON_CSV_APPROVED_AT`
   - `LESSON_CSV_APPROVED_BY`
4. Re-run workflow from validator step with corrected CSV.

## Expected Outcome

- `Lessons` tab is replaced only after validator success + human approval.
- Imported rows preserve CSV order.
- Validation and import events are appended to `Logs`.
