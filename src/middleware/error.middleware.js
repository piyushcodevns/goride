const { ZodError } = require("zod");
const multer = require("multer");
const logger = require("../utils/logger");
const metrics = require("../utils/metrics");
const { redactSensitiveData } = require("../utils/redact");

const errorMiddleware = (err, req, res, next) => {
  const requestId = req?.id || req?.headers?.["x-request-id"] || null;
  const method = req?.method;
  const path = req?.originalUrl || req?.url;

  // Record error metric
  metrics.recordError(err?.name || "UnhandledError");

  // Structured internal logging with redaction
  logger.error(err?.message || "Internal Server Error", {
    requestId,
    method,
    path,
    errorName: err?.name,
    isOperational: err?.isOperational,
    stack: err?.stack,
    meta: redactSensitiveData(err?.meta || {}),
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: err.errors,
      ...(requestId ? { requestId } : {}),
    });
  }

  if (err instanceof multer.MulterError) {
    const multerMessages = {
      LIMIT_FILE_SIZE: "File size must not exceed 5 MB.",
      LIMIT_FILE_COUNT: "Only one file is allowed.",
      LIMIT_UNEXPECTED_FILE: "Invalid or unsupported file upload.",
      LIMIT_PART_COUNT: "Too many form parts.",
      LIMIT_FIELD_COUNT: "Too many form fields.",
      LIMIT_FIELD_KEY: "Form field name is too long.",
      LIMIT_FIELD_VALUE: "Form field value is too long.",
      LIMIT_HEADER_COUNT: "Too many multipart headers.",
    };

    return res.status(400).json({
      success: false,
      message: multerMessages[err.code] || "Invalid file upload.",
      ...(requestId ? { requestId } : {}),
    });
  }

  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body.",
      ...(requestId ? { requestId } : {}),
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(requestId ? { requestId } : {}),
    });
  }

  // Generic 500: never expose stack traces, database credentials, or filesystem paths to clients
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
    ...(requestId ? { requestId } : {}),
  });
};

module.exports = errorMiddleware;
