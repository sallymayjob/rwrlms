/** Pure content formatting helpers. */

function formatLessonCardForSlack(lesson, options) {
  var opts = options || {};
  var heading = opts.heading || '*Lesson*';
  return formatLessonContentForSlack(lesson, { heading: heading });
}

function formatReportSummaryForSlack(summary) {
  var model = summary || {};
  return [
    '*LMS Report*',
    'Learners: ' + toNumber(model.learners, 0),
    'Active Learners: ' + toNumber(model.activeLearners, 0),
    'Completed Learners: ' + toNumber(model.completedLearners, 0),
    'Submissions: ' + toNumber(model.submissions, 0),
    'Unique Learners Submitting: ' + toNumber(model.uniqueLearnerSubmissions, 0),
    'QA Records: ' + toNumber(model.qaRecords, 0),
    'QA↔Submission Links: ' + toNumber(model.qaRecordsLinkedToSubmissions, 0),
    'Metrics Rows: ' + toNumber(model.metrics, 0),
    'Slack Threads: ' + toNumber(model.slackThreads, 0)
  ].join('\n');
}
