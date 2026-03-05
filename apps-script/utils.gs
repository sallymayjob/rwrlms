/** Utility helpers shared across modules. */

function getScriptProperty(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error('Missing script property: ' + key);
  }
  return value;
}

function getOptionalScriptProperty(key, fallback) {
  return PropertiesService.getScriptProperties().getProperty(key) || fallback;
}

function nowISO() {
  return new Date().toISOString();
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function makeId(prefix) {
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefix + '-' + stamp + '-' + rand;
}

function percent(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function toNumber(value, fallback) {
  const num = Number(value);
  return isNaN(num) ? (fallback || 0) : num;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function normalizeWhitespace(input) {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

function parseFormEncoded(payload) {
  const out = {};
  String(payload || '').split('&').forEach(function (pair) {
    if (!pair) return;
    const parts = pair.split('=');
    const key = decodeURIComponent(parts[0] || '');
    const value = decodeURIComponent((parts.slice(1).join('=') || '').replace(/\+/g, ' '));
    out[key] = value;
  });
  return out;
}

function withErrorGuard(fnName, fn) {
  try {
    return fn();
  } catch (error) {
    logError(fnName, error, { stack: error.stack });
    return slackEphemeral('Something went wrong in `' + fnName + '`. Please contact support.');
  }
}
