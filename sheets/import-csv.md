# Import CSV Data

## Purpose

Use this runbook when ingesting AI-generated (Gemini) lesson CSV content into the `Lessons` sheet. The process is intentionally deterministic: imports are blocked unless the exact validated file is explicitly human-approved.

## Required CSV Headers + Validation Rules

### Required headers (must exist)

- `LessonID`
- `Title`
- `Module`
- `Status`
- `Hook`
- `CoreContent`
- `Takeaway`
- `Mission`

### Row-level rules enforced by validator

- `LessonID`
  - required
  - must match regex `^M\d{2}-W\d{2}-L\d{2}$`
  - must be unique within the uploaded CSV
- Narrative fields (`Title`, `Hook`, `CoreContent`, `Takeaway`, `Mission`)
  - each is required and non-empty
- `Status`
  - required
  - must be one of: `active`, `draft`, `archived`, `needs_revision`
- `Module`
  - required
  - must exist in the `Modules` sheet (`ModuleID` linkage check)

## Deterministic Review Workflow (Required)

### 1) AI output uploaded

1. Upload the Gemini-produced CSV to Google Drive.
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

> `importLessonsCSV()` is now gated. It will fail if:
> - the current `LESSON_CSV_FILE_ID` was not approved, or
> - file contents changed after approval (checksum mismatch).

## Operator Checklist

- [ ] I uploaded the latest Gemini CSV and set `LESSON_CSV_FILE_ID`.
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
