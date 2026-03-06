/** Pure taxonomy and topic tagger helpers. */

function buildLessonTags(lesson) {
  if (!lesson) return [];
  var raw = [lesson.Topic, lesson.Content, lesson.Objective]
    .filter(function (v) { return !!v; })
    .join(' ')
    .toLowerCase();

  var tags = [];
  var taxonomy = {
    fundamentals: ['intro', 'foundation', 'basics'],
    practice: ['exercise', 'quiz', 'practice'],
    advanced: ['advanced', 'optimization', 'architecture'],
    collaboration: ['team', 'review', 'feedback']
  };

  Object.keys(taxonomy).forEach(function (tag) {
    var hit = taxonomy[tag].some(function (keyword) {
      return raw.indexOf(keyword) >= 0;
    });
    if (hit) tags.push(tag);
  });

  return tags;
}
