const { inspect } = require("node:util");

function stringifyValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.stack || value.message;

  try {
    return JSON.stringify(value);
  } catch {
    return inspect(value, { depth: 4, breakLength: 120 });
  }
}

function formatError(error) {
  if (!error) return "Unknown error";

  const parts = [];

  if (error.statusCode) parts.push(`status=${error.statusCode}`);
  if (error.message) parts.push(error.message);

  const bodyError = error.body?.error;
  if (bodyError) {
    if (typeof bodyError === "string") {
      parts.push(bodyError);
    } else {
      if (bodyError.message) parts.push(bodyError.message);
      if (bodyError.status) parts.push(`spotify_status=${bodyError.status}`);
      parts.push(stringifyValue(bodyError));
    }
  }

  if (error.body?.error_description) parts.push(error.body.error_description);
  if (error.body && !bodyError && !error.body.error_description) {
    parts.push(stringifyValue(error.body));
  }

  if (parts.length === 0) return stringifyValue(error) || "Unknown error";

  return [...new Set(parts.filter(Boolean))].join(" | ");
}

module.exports = formatError;
