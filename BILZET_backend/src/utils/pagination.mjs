/**
 * Extracts and sanitizes pagination parameters from query string.
 */
export const getPaginationParams = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || defaultLimit;
  if (limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const skip = (page - 1) * limit;

  // Sorting
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortOrder };

  return { page, limit, skip, sort };
};

/**
 * Builds standard pagination metadata object.
 */
export const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

export default {
  getPaginationParams,
  buildPaginationMeta
};
