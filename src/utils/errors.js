/**
 * Custom Error Classes
 * Provides structured error handling with proper HTTP status codes
 */

/**
 * Base API Error
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.errorCode,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found', resource = 'Resource') {
    super(message, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * Bad Request Error (400)
 */
export class BadRequestError extends ApiError {
  constructor(message = 'Bad request', details = null) {
    super(message, 400, 'BAD_REQUEST');
    this.details = details;
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict', resource = 'Resource') {
    super(message, 409, 'CONFLICT');
    this.resource = resource;
  }
}

/**
 * Validation Error (422)
 */
export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Service Unavailable Error (503)
 */
export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable', service = 'Service') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
    this.service = service;
  }
}

/**
 * WhatsApp-specific errors
 */
export class WhatsAppConnectionError extends ApiError {
  constructor(message = 'WhatsApp connection failed', accountId = null) {
    super(message, 400, 'WHATSAPP_CONNECTION_ERROR');
    this.accountId = accountId;
  }
}

export class WhatsAppNotConnectedError extends ApiError {
  constructor(message = 'WhatsApp account is not connected', accountId = null) {
    super(message, 400, 'WHATSAPP_NOT_CONNECTED');
    this.accountId = accountId;
  }
}

export class WhatsAppQRExpiredError extends ApiError {
  constructor(message = 'QR code has expired', accountId = null) {
    super(message, 400, 'WHATSAPP_QR_EXPIRED');
    this.accountId = accountId;
  }
}

export class WhatsAppMessageLimitError extends ApiError {
  constructor(message = 'Daily message limit reached', accountId = null) {
    super(message, 429, 'WHATSAPP_MESSAGE_LIMIT');
    this.accountId = accountId;
  }
}

/**
 * Check if error is an ApiError
 */
export function isApiError(error) {
  return error instanceof ApiError;
}

/**
 * Error handler middleware helper
 */
export function handleError(error, res) {
  if (isApiError(error)) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Default to 500 for unknown errors
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
}

export default {
  ApiError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  ServiceUnavailableError,
  WhatsAppConnectionError,
  WhatsAppNotConnectedError,
  WhatsAppQRExpiredError,
  WhatsAppMessageLimitError,
  isApiError,
  handleError,
};
