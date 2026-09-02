const { ZodError } = require("zod");
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