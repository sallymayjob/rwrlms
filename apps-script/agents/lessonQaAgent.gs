/** Pure lesson quality checks and validation rules. */

function qaLessonRecord(lesson) {
  var issues = [];
  if (!lesson || typeof lesson !== 'object') {
    return { valid: false, issues: ['Missing lesson object.'] };
  }

  var parsedLessonId = parseLessonId(lesson.LessonID);
  if (!parsedLessonId) {
    issues.push('LessonID is missing or invalid. Supported format: ' + CONFIG.LESSON_ID_FORMAT_DESCRIPTION);
  }

  if (!String(lesson.Module || '').trim()) {
    issues.push('Module is required.');
  }

  if (!String(lesson.Topic || '').trim()) {
    issues.push('Topic is required.');
  }

  if (!String(lesson.Status || '').trim()) {
    issues.push('Status is required.');
  }

  return {
    valid: issues.length === 0,
    issues: issues
  };
}
