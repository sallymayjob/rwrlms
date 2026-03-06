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
    LESSON_CSV_FILE_ID: 'LESSON_CSV_FILE_ID'
  },
  WORKFLOW_POLICY: {
    ACTIONS: ['select', 'insert', 'update'],
    SHEETS_BY_ACTION: {
      select: ['Learners', 'Submissions', 'Courses', 'Modules', 'Lessons', 'Logs'],
      insert: ['Learners', 'Submissions', 'Logs'],
      update: ['Learners', 'Submissions']
    },
    FIELDS_BY_ACTION_AND_SHEET: {
      insert: {
        Learners: ['UserID', 'Name', 'Email', 'CourseID', 'CurrentModule', 'Progress', 'Status', 'JoinedDate'],
        Submissions: ['SubmissionID', 'UserID', 'LessonID', 'Timestamp', 'Score', 'Status', 'Method'],
        Logs: ['Timestamp', 'Level', 'EventType', 'UserID', 'Command', 'Message', 'ContextJSON']
      },
      update: {
        Learners: ['CourseID', 'CurrentModule', 'Progress', 'Status', 'Name', 'Email'],
        Submissions: ['Score', 'Status', 'Method']
      }
    }
  }
};
