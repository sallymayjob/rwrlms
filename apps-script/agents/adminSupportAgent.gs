/** Pure admin support parsing and guardrails. */

function parseAdminAction(text) {
  var parts = normalizeWhitespace(text || '').split(' ').filter(Boolean);
  return {
    action: (parts[0] || '').toLowerCase(),
    target: parts[1] || '',
    arg: parts.slice(2).join(' ')
  };
}

function validateAdminAction(request) {
  var allowed = ['resync', 'rebuild', 'healthcheck', 'reindex'];
  if (!request || allowed.indexOf(request.action) < 0) {
    return {
      ok: false,
      reason: 'Unsupported admin action. Allowed: ' + allowed.join(', ')
    };
  }

  return { ok: true };
}
