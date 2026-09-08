/**
 * Sensitive field patterns to redact from logs, errors, and payloads.
 */
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /pass/i,
  /token/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /apikey/i,
  /api_key/i,
  /encryptionkey/i,
  /encryption_key/i,
  /otp/i,
  /twofactor/i,
  /two_factor/i,
  /creditcard/i,
  /cardnumber/i,
  /cvv/i,
  /pin/i,
  /jwt/i,
  /bearer/i,
];

const REDACTED_VALUE = "[REDACTED]";

/**
 * Check if a key name matches any sensitive pattern.
 */
const isSensitiveKey = (key) => {
  if (typeof key !== "string") {
    return false;
  }
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
};

/**
 * Redact potential bearer tokens or secrets embedded inside strings.
 */
const sanitizeString = (str) => {
  if (typeof str !== "string") {
    return str;
  }
  return str
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, "$1[REDACTED]")
    .replace(/(redis:\/\/[^:]+:)[^@]+(@)/gi, "$1***$2");
};

/**
 * Recursively redact sensitive information from objects, arrays, and values.
 * Uses a WeakSet to guard against circular references.
 *
 * @param {*} data - Any input data
 * @param {WeakSet} [visited] - Seen references
 * @returns {*} Sanitized data
 */
const redactSensitiveData = (data, visited = new WeakSet()) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    return sanitizeString(data);
  }

  if (typeof data !== "object") {
    return data;
  }

  // Handle Date, RegExp, Error
  if (data instanceof Date) {
    return data;
  }

  if (data instanceof RegExp) {
    return data.toString();
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: sanitizeString(data.message),
      code: data.code,
      stack: sanitizeString(data.stack),
    };
  }

  // Avoid circular reference infinite loops
  if (visited.has(data)) {
    return "[Circular]";
  }
  visited.add(data);

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, visited));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = REDACTED_VALUE;
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = redactSensitiveData(value, visited);
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

module.exports = {
  isSensitiveKey,
  sanitizeString,
  redactSensitiveData,
  REDACTED_VALUE,
};
