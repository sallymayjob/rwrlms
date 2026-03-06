/** Pure reporting summarizers. */

function summarizeLmsState(learners, submissions, qaRecords, metricRecords, slackThreads) {
  var learnerRows = learners || [];
  var submissionRows = submissions || [];
  var qaRows = qaRecords || [];
  var metricRows = metricRecords || [];
  var threadRows = slackThreads || [];

  var active = learnerRows.filter(function (l) {
    return String(l.Status).toLowerCase() === 'active';
  }).length;

  var completed = learnerRows.filter(function (l) {
    return String(l.Status).toLowerCase() === 'completed';
  }).length;

  var submissionCanonical = resolveTableCanonicalColumns('LESSON_SUBMISSIONS');
  var qaCanonical = resolveTableCanonicalColumns('QA_RECORDS');

  var linkedQaRecords = qaRows.filter(function (qa) {
    var submissionId = getCanonicalValue(qa, qaCanonical, 'submissionRecordId');
    if (!submissionId) return false;
    return !!findDuplicateRowByCanonicalValues('LESSON_SUBMISSIONS', { submissionRecordId: submissionId });
  }).length;

  var uniqueLearners = submissionRows.reduce(function (acc, row) {
    var learnerId = String(getCanonicalValue(row, submissionCanonical, 'learnerId') || '');
    if (learnerId) acc[learnerId] = true;
    return acc;
  }, {});

  return {
    learners: learnerRows.length,
    activeLearners: active,
    completedLearners: completed,
    submissions: submissionRows.length,
    uniqueLearnerSubmissions: Object.keys(uniqueLearners).length,
    qaRecords: qaRows.length,
    qaRecordsLinkedToSubmissions: linkedQaRecords,
    metrics: metricRows.length,
    slackThreads: threadRows.length
  };
}
