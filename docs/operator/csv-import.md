# CSV Import Operations

Operational guidance for lesson content refresh via Drive CSV ingestion.

## Preconditions

- `LESSON_CSV_FILE_ID` exists in Script Properties.
- CSV headers match expected lesson schema.
- Import occurs during low-traffic window when possible.

## Runbook

1. Upload/replace lesson CSV in Google Drive.
2. Confirm file ID matches `LESSON_CSV_FILE_ID`.
3. Run `importLessonsCSV()` in Apps Script.
4. Validate row counts and sample lessons in `Lessons` tab.
5. Run a `/learn` smoke test to verify retrieval integrity.

## Failure handling

- On schema mismatch: stop import and restore prior CSV.
- On partial write: revert using backup sheet snapshot and rerun import.
- Log all import failures with reason and remediation owner.
