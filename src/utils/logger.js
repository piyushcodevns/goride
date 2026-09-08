const { createLogger, format, transports } = require("winston");
const { redactSensitiveData, sanitizeString } = require("./redact");

const logLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "test"
    ? "warn"
    : process.env.NODE_ENV === "production"
    ? "info"
    : "debug");

const isJsonFormat = process.env.LOG_FORMAT === "json";

const redactFormatter = format((info) => {
  return redactSensitiveData(info);
});

const customPrintFormat = format.printf(
  ({ level, message, timestamp, stack, ...meta }) => {
    const cleanMeta = redactSensitiveData(meta);
    const metadata =
      cleanMeta && Object.keys(cleanMeta).length > 0
        ? ` ${JSON.stringify(cleanMeta)}`
        : "";

    const safeMessage = sanitizeString(stack || message);

    return `${timestamp} [${level.toUpperCase()}] ${safeMessage}${metadata}`;
  },
);

const loggerTransports = [
  new transports.Console({
    silent: process.env.NODE_ENV === "test" && process.env.ENABLE_TEST_LOGS !== "true",
  }),
];

// In non-test environments, write to bounded rotating log files
if (process.env.NODE_ENV !== "test") {
  loggerTransports.push(
    new transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
    new transports.File({
      filename: "logs/combined.log",
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
    }),
  );
}

const logger = createLogger({
  level: logLevel,
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({
      stack: true,
    }),
    redactFormatter(),
    isJsonFormat ? format.json() : customPrintFormat,
  ),
  transports: loggerTransports,
});

logger.redact = redactSensitiveData;

module.exports = logger;