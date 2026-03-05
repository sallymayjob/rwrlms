# Import CSV Data

## Option A: Manual Import

1. Open `RWR_LMS_DATABASE`.
2. Select target tab (e.g., `Lessons`).
3. Use **File → Import → Upload**.
4. Choose matching template from `database/`.
5. Import replacing current sheet content.

## Option B: Google Drive + Apps Script Function

1. Upload CSV to Drive.
2. Copy file ID from the Drive URL.
3. Add Script Property `LESSON_CSV_FILE_ID`.
4. Run `importLessonsCSV()` from Apps Script editor.

## Expected Outcome

- `Lessons` tab is replaced with parsed CSV rows.
- Data remains ordered by input CSV row sequence.
- An event log row is appended in `Logs`.
