/**
 * Global configuration and constants.
 */
const CONFIG = {
  SHEET_NAMES: {
    COURSES: 'Courses',
    MONTHS: 'Months',
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
    BOT_TOKEN: 'SLACK_BOT_TOKEN',
    LESSON_CSV_FILE_ID: 'LESSON_CSV_FILE_ID'
  }
};
