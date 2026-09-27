import { ApiError } from '../utils/ApiError.mjs';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Endpoint not found - ${req.method} ${req.originalUrl}`));
};

export default notFoundHandler;
