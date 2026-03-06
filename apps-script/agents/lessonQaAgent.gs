/** Pure lesson quality checks and validation rules. */

function qaLessonRecord(lesson) {
  var issues = [];
  if (!lesson || typeof lesson !== 'object') {
    return { valid: false, issues: ['Missing lesson object.'] };
  }

  if (!CONFIG.LESSON_ID_REGEX.test(String(lesson.LessonID || ''))) {
    issues.push('LessonID is missing or invalid format.');
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
