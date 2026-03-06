/**
 * Global configuration and constants.
 */
const CONFIG = {
  SHEET_NAMES: {
    COURSES: 'Courses',
    MODULES: 'Modules',
    LESSONS: 'Lessons',
    LEARNERS: 'Learners',
    SUBMISSIONS: 'Submissions',
    LOGS: 'Logs'
  },
  COMMANDS: [
    '/onboard', '/enroll', '/progress', '/learn', '/submit',
    '/cert', '/report', '/gaps', '/courses', '/help', '/unenroll'
  ],
  LESSON_ID_REGEX: /^M\d{2}-W\d{2}-L\d{2}$/,
  SLACK_MAX_TIMESTAMP_SKEW_SEC: 300,
  DEFAULT_PROGRESS_INCREMENT: 5,
  CERT_MIN_PROGRESS: 100,
  PROPERTIES: {
    SHEET_ID: 'SPREADSHEET_ID',
    SIGNING_SECRET: 'SLACK_SIGNING_SECRET',
    VERIFICATION_TOKEN: 'SLACK_VERIFICATION_TOKEN',
    BOT_TOKEN: 'SLACK_BOT_TOKEN',
    LESSON_CSV_FILE_ID: 'LESSON_CSV_FILE_ID',
    LESSON_CSV_APPROVED_FILE_ID: 'LESSON_CSV_APPROVED_FILE_ID',
    LESSON_CSV_APPROVED_CHECKSUM: 'LESSON_CSV_APPROVED_CHECKSUM',
    LESSON_CSV_APPROVED_AT: 'LESSON_CSV_APPROVED_AT',
    LESSON_CSV_APPROVED_BY: 'LESSON_CSV_APPROVED_BY'
  }
};
