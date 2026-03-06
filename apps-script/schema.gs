/**
 * Canonical spreadsheet schemas and header conversion helpers.
 */

var TABLE_SCHEMAS = {
  Courses: {
    required: ['course.id', 'course.title', 'course.status'],
    optional: ['course.moduleIds', 'course.totalModules', 'course.totalLessons', 'course.description', 'meta.lastUpdated'],
    fields: {
      'course.id': { header: 'Course ID', aliases: ['CourseID'] },
      'course.title': { header: 'Course Title', aliases: ['CourseTitle', 'Course Name'] },
      'course.moduleIds': { header: 'Module IDs', aliases: ['MonthIDs'] },
      'course.totalModules': { header: 'Total Modules', aliases: ['TotalMonths'] },
      'course.totalLessons': { header: 'Total Lessons', aliases: ['PublishedLessons', 'TotalLessons'] },
      'course.status': { header: 'Status', aliases: [] },
      'course.description': { header: 'Description', aliases: [] },
      'meta.lastUpdated': { header: 'Last Updated', aliases: ['LastUpdated'] }
    }
  },
  Modules: {
    required: ['module.id', 'module.title', 'course.id', 'module.status'],
    optional: ['module.number', 'module.lessonIds', 'module.totalLessons', 'meta.lastUpdated'],
    fields: {
      'module.id': { header: 'Module ID', aliases: ['ModuleID'] },
      'module.title': { header: 'Module Title', aliases: ['ModuleTitle'] },
      'course.id': { header: 'Course ID', aliases: ['CourseID'] },
      'module.number': { header: 'Module Number', aliases: ['ModuleNumber'] },
      'module.lessonIds': { header: 'Lesson IDs', aliases: ['LessonIDs'] },
      'module.totalLessons': { header: 'Total Lessons', aliases: ['TotalLessons'] },
      'module.status': { header: 'Status', aliases: [] },
      'meta.lastUpdated': { header: 'Last Updated', aliases: ['LastUpdated'] }
    }
  },
  Lessons: {
    required: ['lesson.id', 'lesson.title', 'module.id', 'lesson.status'],
    optional: ['lesson.topic', 'lesson.objective', 'lesson.type', 'lesson.difficulty', 'lesson.content'],
    fields: {
      'lesson.id': { header: 'Lesson ID', aliases: ['LessonID'] },
      'lesson.title': { header: 'Title', aliases: [] },
      'module.id': { header: 'Module ID', aliases: ['Module', 'ModuleID'] },
      'lesson.status': { header: 'Status', aliases: [] },
      'lesson.topic': { header: 'Topic', aliases: [] },
      'lesson.objective': { header: 'Objective', aliases: [] },
      'lesson.type': { header: 'Type', aliases: [] },
      'lesson.difficulty': { header: 'Difficulty', aliases: [] },
      'lesson.content': { header: 'Core Content', aliases: ['CoreContent'] }
    }
  },
  Learners: {
    required: ['learner.userId', 'learner.status'],
    optional: ['learner.name', 'learner.email', 'learner.courseId', 'learner.currentModule', 'learner.progressPct', 'learner.joinedDate'],
    fields: {
      'learner.userId': { header: 'Learner', aliases: ['UserID', 'User Id', 'Slack User ID'] },
      'learner.name': { header: 'Name', aliases: [] },
      'learner.email': { header: 'Email', aliases: [] },
      'learner.courseId': { header: 'Course ID', aliases: ['CourseID'] },
      'learner.currentModule': { header: 'Current Module', aliases: ['CurrentModule'] },
      'learner.progressPct': { header: 'Progress (%)', aliases: ['Progress', 'Progress %'] },
      'learner.status': { header: 'Status', aliases: [] },
      'learner.joinedDate': { header: 'Joined Date', aliases: ['JoinedDate'] }
    }
  },
  'Lesson Submissions': {
    required: ['submission.id', 'learner.userId', 'lesson.id', 'submission.timestamp', 'submission.status'],
    optional: ['submission.score', 'submission.method'],
    fields: {
      'submission.id': { header: 'Submission ID', aliases: ['SubmissionID'] },
      'learner.userId': { header: 'Learner', aliases: ['UserID'] },
      'lesson.id': { header: 'Lesson ID', aliases: ['LessonID'] },
      'submission.timestamp': { header: 'Submitted At', aliases: ['Timestamp'] },
      'submission.score': { header: 'Score', aliases: [] },
      'submission.status': { header: 'Status', aliases: [] },
      'submission.method': { header: 'Method', aliases: [] }
    }
  },
  'Lesson QA Records': {
    required: ['qa.recordId', 'lesson.id', 'qa.status'],
    optional: ['qa.score', 'qa.feedback', 'qa.reviewedAt', 'qa.reviewer'],
    fields: {
      'qa.recordId': { header: 'QA Record ID', aliases: ['RecordID'] },
      'lesson.id': { header: 'Lesson ID', aliases: ['LessonID'] },
      'qa.status': { header: 'QA Status', aliases: ['Status'] },
      'qa.score': { header: 'QA Score', aliases: ['Score'] },
      'qa.feedback': { header: 'Feedback', aliases: [] },
      'qa.reviewedAt': { header: 'Reviewed At', aliases: ['Timestamp'] },
      'qa.reviewer': { header: 'Reviewer', aliases: ['UserID'] }
    }
  },
  'Lesson Metrics': {
    required: ['lesson.id', 'metrics.generatedAt'],
    optional: ['metrics.views', 'metrics.completions', 'metrics.passRate', 'metrics.avgScore'],
    fields: {
      'lesson.id': { header: 'Lesson ID', aliases: ['LessonID'] },
      'metrics.generatedAt': { header: 'Generated At', aliases: ['Timestamp'] },
      'metrics.views': { header: 'Views', aliases: [] },
      'metrics.completions': { header: 'Completions', aliases: [] },
      'metrics.passRate': { header: 'Pass Rate (%)', aliases: ['PassRate', 'CompletionRate'] },
      'metrics.avgScore': { header: 'Average Score', aliases: ['AvgScore'] }
    }
  },
  'Slack Threads': {
    required: ['thread.id', 'thread.channel', 'thread.startedAt'],
    optional: ['thread.userId', 'thread.lessonId', 'thread.status', 'thread.lastMessageAt'],
    fields: {
      'thread.id': { header: 'Thread TS', aliases: ['ThreadID', 'ThreadTs'] },
      'thread.channel': { header: 'Channel', aliases: ['ChannelID'] },
      'thread.startedAt': { header: 'Started At', aliases: ['Timestamp'] },
      'thread.userId': { header: 'Learner', aliases: ['UserID'] },
      'thread.lessonId': { header: 'Lesson ID', aliases: ['LessonID'] },
      'thread.status': { header: 'Status', aliases: [] },
      'thread.lastMessageAt': { header: 'Last Message At', aliases: ['LastUpdated'] }
    }
  },
  Logs: {
    required: ['log.timestamp', 'log.level', 'log.eventType', 'log.message'],
    optional: ['learner.userId', 'log.command', 'log.contextJson'],
    fields: {
      'log.timestamp': { header: 'Timestamp', aliases: [] },
      'log.level': { header: 'Level', aliases: [] },
      'log.eventType': { header: 'Event Type', aliases: ['EventType'] },
      'learner.userId': { header: 'Learner', aliases: ['UserID'] },
      'log.command': { header: 'Command', aliases: [] },
      'log.message': { header: 'Message', aliases: [] },
      'log.contextJson': { header: 'Context JSON', aliases: ['ContextJSON'] }
    }
  }
};

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[%]/g, ' pct ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

var TABLE_NAME_ALIASES = {
  Submissions: 'Lesson Submissions'
};

function getTableSchema(tableName) {
  var canonicalName = TABLE_NAME_ALIASES[tableName] || tableName;
  return TABLE_SCHEMAS[canonicalName] || null;
}

function getLogicalHeaderMap(tableName) {
  var schema = getTableSchema(tableName);
  if (!schema) return {};
  var out = {};
  Object.keys(schema.fields).forEach(function (logicalField) {
    out[logicalField] = schema.fields[logicalField].header;
  });
  return out;
}

function buildHeaderIndex(headers, tableName) {
  var schema = getTableSchema(tableName);
  if (!schema) {
    return {
      headers: headers || [],
      tableName: tableName,
      headerToIndex: {},
      logicalToIndex: {},
      logicalToHeader: {},
      missingRequired: []
    };
  }

  var normalizedToLogical = {};
  Object.keys(schema.fields).forEach(function (logicalField) {
    var field = schema.fields[logicalField];
    [field.header].concat(field.aliases || []).forEach(function (name) {
      normalizedToLogical[normalizeHeader(name)] = logicalField;
    });
  });

  var headerToIndex = {};
  var logicalToIndex = {};
  var logicalToHeader = {};

  (headers || []).forEach(function (header, idx) {
    var normalized = normalizeHeader(header);
    headerToIndex[header] = idx;
    var logicalField = normalizedToLogical[normalized];
    if (logicalField && logicalToIndex[logicalField] === undefined) {
      logicalToIndex[logicalField] = idx;
      logicalToHeader[logicalField] = header;
    }
  });

  var missingRequired = (schema.required || []).filter(function (logicalField) {
    return logicalToIndex[logicalField] === undefined;
  });

  return {
    headers: headers || [],
    tableName: tableName,
    headerToIndex: headerToIndex,
    logicalToIndex: logicalToIndex,
    logicalToHeader: logicalToHeader,
    missingRequired: missingRequired
  };
}

function validateRequiredHeaders(headers, tableName) {
  var index = buildHeaderIndex(headers, tableName);
  if (!index.missingRequired.length) return index;

  var schema = getTableSchema(tableName);
  var missingHeaders = index.missingRequired.map(function (logicalField) {
    return schema.fields[logicalField].header;
  });
  throw new Error(
    'Missing required headers for table "' + tableName + '": ' + missingHeaders.join(', ')
  );
}

function rowToObject(row, headers, tableName) {
  var index = validateRequiredHeaders(headers, tableName);
  var schema = getTableSchema(tableName);
  var obj = {};

  if (!schema) {
    (headers || []).forEach(function (header, i) {
      obj[header] = row[i];
    });
    return obj;
  }

  Object.keys(schema.fields).forEach(function (logicalField) {
    var field = schema.fields[logicalField];
    var colIndex = index.logicalToIndex[logicalField];
    if (colIndex === undefined) return;
    var value = row[colIndex];

    obj[logicalField] = value;
    obj[field.header] = value;
    (field.aliases || []).forEach(function (alias) {
      obj[alias] = value;
    });
  });

  return obj;
}

function objectToRow(obj, headers, tableName) {
  var index = validateRequiredHeaders(headers, tableName);
  var schema = getTableSchema(tableName);

  if (!schema) {
    return (headers || []).map(function (header) {
      return obj[header] !== undefined ? obj[header] : '';
    });
  }

  return (headers || []).map(function (header, idx) {
    var value = obj[header];
    if (value !== undefined) return value;

    var logicalField = null;
    Object.keys(index.logicalToIndex).forEach(function (key) {
      if (index.logicalToIndex[key] === idx) logicalField = key;
    });
    if (!logicalField) return '';

    var field = schema.fields[logicalField];
    if (obj[logicalField] !== undefined) return obj[logicalField];
    if (obj[field.header] !== undefined) return obj[field.header];

    for (var i = 0; i < (field.aliases || []).length; i++) {
      var alias = field.aliases[i];
      if (obj[alias] !== undefined) return obj[alias];
    }
    return '';
  });
}
