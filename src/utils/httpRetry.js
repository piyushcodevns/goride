const logger = require("./logger");

/**
 * Retry HTTP request for transient failures.
 *
 * @param {Function} requestFn - Function that returns an Axios promise.
 * @param {Object} options
 * @param {number} options.retries - Maximum retry attempts.
 * @param {number} options.delay - Initial delay between retries (ms).
 */
const httpRetry = async (requestFn, { retries = 2, delay = 500 } = {}) => {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      const status = error.response?.status;

      const retryable =
        !status ||
        status === 408 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        error.code === "ECONNABORTED";

      if (!retryable || attempt === retries) {
        throw error;
      }

      const retryNumber = attempt + 1;

      const backoffDelay = delay * Math.pow(2, attempt);

      const jitter = Math.floor(Math.random() * 200);

      const finalDelay = backoffDelay + jitter;

      logger.warn(
        `HTTP retry attempt ${retryNumber}/${retries} after ${finalDelay}ms. Reason: ${
          error.message
        }`,
      );

      await new Promise((resolve) => setTimeout(resolve, finalDelay));
    }
  }

  throw lastError;
};

module.exports = httpRetry;
