import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import { ApiError } from '../utils/ApiError.mjs';
import { User } from '../models/User.mjs';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination.mjs';

export const getUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = getPaginationParams(req.query);
  const filter = {};

  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } },
      { phone: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter)
  ]);

  return sendResponse(
    res,
    200,
    { users },
    'Users fetched successfully',
    buildPaginationMeta(total, page, limit)
  );
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return sendResponse(res, 200, { user }, 'User fetched successfully');
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const allowedUpdates = ['name', 'phone', 'role', 'isActive', 'password'];
  for (const field of allowedUpdates) {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  }

  await user.save();
  return sendResponse(res, 200, { user }, 'User updated successfully');
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Soft delete / deactivate
  user.isActive = false;
  await user.save();

  return sendResponse(res, 200, {}, 'User deactivated successfully');
});

export default {
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};
