/** Pure reporting summarizers. */

function summarizeLmsState(learners, submissions) {
  var learnerRows = learners || [];
  var submissionRows = submissions || [];

  var active = learnerRows.filter(function (l) {
    return String(l.Status).toLowerCase() === 'active';
  }).length;

  var completed = learnerRows.filter(function (l) {
    return String(l.Status).toLowerCase() === 'completed';
  }).length;

  return {
    learners: learnerRows.length,
    activeLearners: active,
    completedLearners: completed,
    submissions: submissionRows.length
  };
}
