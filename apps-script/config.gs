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
    LESSON_SUBMISSIONS: 'Submissions',
    QA_RECORDS: 'QARecords',
    METRICS: 'Metrics',
    SLACK_THREADS: 'SlackThreads',
    LOGS: 'Logs'
  },
  SCHEMA: {
    TABLES: {
      LESSON_SUBMISSIONS: {
        sheetName: 'Submissions',
        primaryKey: 'SubmissionID',
        canonicalKeys: {
          submissionRecordId: ['SubmissionID', 'submission_id'],
          learnerId: ['UserID', 'LearnerID', 'user_id'],
          lessonId: ['LessonID', 'lesson_id'],
          submittedAt: ['Timestamp', 'SubmittedAt', 'timestamp'],
          status: ['Status'],
          score: ['Score'],
          method: ['Method'],
          idempotencyKey: ['IdempotencyKey', 'RequestID', 'request_id']
        }
      },
      QA_RECORDS: {
        sheetName: 'QARecords',
        primaryKey: 'QARecordID',
        canonicalKeys: {
          qaRecordId: ['QARecordID', 'RecordID'],
          lessonId: ['LessonID', 'lesson_id'],
          learnerId: ['LearnerID', 'UserID', 'user_id'],
          submissionRecordId: ['SubmissionID', 'submission_id'],
          reviewedAt: ['ReviewedAt', 'Timestamp'],
          status: ['Status'],
          notes: ['Notes'],
          idempotencyKey: ['IdempotencyKey', 'RequestID']
        }
      },
      METRICS: {
        sheetName: 'Metrics',
        primaryKey: 'MetricID',
        canonicalKeys: {
          metricId: ['MetricID', 'RecordID'],
          metricName: ['MetricName', 'Name'],
          metricValue: ['MetricValue', 'Value'],
          metricTimestamp: ['MetricTimestamp', 'Timestamp'],
          operationId: ['OperationID', 'RunID'],
          threadTs: ['ThreadTS', 'ThreadTs'],
          idempotencyKey: ['IdempotencyKey', 'RequestID']
        }
      },
      SLACK_THREADS: {
        sheetName: 'SlackThreads',
        primaryKey: 'ThreadID',
        canonicalKeys: {
          threadId: ['ThreadID', 'RecordID'],
          channelId: ['ChannelID', 'channel'],
          threadTs: ['ThreadTS', 'ThreadTs', 'ts'],
          parentTs: ['ParentTS', 'ParentTs'],
          createdAt: ['CreatedAt', 'Timestamp'],
          operationId: ['OperationID', 'RunID'],
          idempotencyKey: ['IdempotencyKey', 'RequestID']
        }
      }
    }
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
