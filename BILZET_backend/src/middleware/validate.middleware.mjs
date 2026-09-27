import { ApiError } from '../utils/ApiError.mjs';

/**
 * Middleware factory to validate request parts against Zod schemas.
 * @param {import('zod').ZodSchema} schema
 * @param {'body'|'query'|'params'} source
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        return next(ApiError.unprocessable('Validation failed', formattedErrors));
      }
      next(error);
    }
  };
};

export default validate;
