import { ApiError } from '../utils/ApiError.mjs';
import { env } from '../config/env.mjs';

export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert generic or Mongoose errors to ApiError
  if (!(error instanceof ApiError)) {
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let errors = [];

    // Mongoose bad ObjectId / CastError
    if (error.name === 'CastError') {
      statusCode = 400;
      message = `Invalid format for resource identifier: '${error.value}'`;
    }

    // Mongoose Duplicate Key (E11000)
    if (error.code === 11000) {
      statusCode = 409;
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      message = `A record with this ${field} already exists: '${error.keyValue[field]}'`;
    }

    // Mongoose Schema Validation Error
    if (error.name === 'ValidationError') {
      statusCode = 422;
      message = 'Database validation error';
      errors = Object.values(error.errors || {}).map((e) => ({
        field: e.path,
        message: e.message
      }));
    }

    // JWT Errors
    if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid authentication token';
    }
    if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Authentication token expired';
    }

    error = new ApiError(statusCode, message, errors, error.stack);
  }

  const response = {
    success: false,
    message: error.message,
    errors: error.errors || []
  };

  // Include stack trace only in development
  if (env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return res.status(error.statusCode || 500).json(response);
};

export default errorHandler;
