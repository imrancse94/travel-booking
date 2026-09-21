export class AppError extends Error {
  constructor(message, statusCode = 500, errors = []) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errors = []) {
    super(message, 404, errors);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = []) {
    super(message, 422, errors);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', errors = []) {
    super(message, 401, errors);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action', errors = []) {
    super(message, 403, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errors = []) {
    super(message, 409, errors);
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Payment processing failed', errors = []) {
    super(message, 402, errors);
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', errors = []) {
    super(message, 500, errors);
  }
}
