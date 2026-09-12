class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 422);
  }
}

class NotificationNotFoundError extends NotFoundError {
  constructor(message = "Notification not found") {
    super(message);
  }
}

class NotificationDeliveryFailedError extends AppError {
  constructor(message = "Notification delivery failed") {
    super(message, 500);
  }
}

class InvalidNotificationChannelError extends BadRequestError {
  constructor(message = "Invalid notification channel") {
    super(message);
  }
}

class InvalidNotificationTypeError extends BadRequestError {
  constructor(message = "Invalid notification type") {
    super(message);
  }
}

class EmailProviderError extends AppError {
  constructor(message = "Email provider error") {
    super(message, 502);
  }
}

class RetryLimitExceededError extends AppError {
  constructor(message = "Retry limit exceeded") {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  NotificationNotFoundError,
  NotificationDeliveryFailedError,
  InvalidNotificationChannelError,
  InvalidNotificationTypeError,
  EmailProviderError,
  RetryLimitExceededError,
};
