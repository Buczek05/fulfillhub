// Błędy domenowe. Service rzuca je bez wiedzy o HTTP, errorHandler tłumaczy na odpowiedź.
class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(details, message = "Validation failed", code = "VALIDATION_ERROR") {
    super(message, 400, code, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHORIZED") {
    super(message, 401, code);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

class NotFoundError extends AppError {
  constructor(resource = "Resource", code = "NOT_FOUND") {
    super(`${resource} not found`, 404, code);
  }
}

class ConflictError extends AppError {
  constructor(message, code = "CONFLICT", details) {
    super(message, 409, code, details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
