const {
  NOTIFICATION_RETRY,
} = require("../../constants/notification.constants");

const getRetryDelay = (attempt) => {
  return (
    NOTIFICATION_RETRY.DELAYS[attempt] ??
    NOTIFICATION_RETRY.DELAYS[
      NOTIFICATION_RETRY.DELAYS.length - 1
    ]
  );
};

const canRetry = (retryCount) => {
  return retryCount < NOTIFICATION_RETRY.MAX_ATTEMPTS;
};

module.exports = {
  getRetryDelay,
  canRetry,
};