const { ZodError } = require("zod");
const multer = require("multer");
const logger = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  logger.error(
    err.stack || err.message
  );

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: err.errors,
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
      message:
        multerMessages[err.code] ||
        "Invalid file upload.",
    });
  }

  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body.",
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

module.exports = errorMiddleware;
