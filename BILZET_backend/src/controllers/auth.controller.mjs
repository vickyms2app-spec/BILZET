import { asyncHandler } from '../utils/asyncHandler.mjs';
import { sendResponse } from '../utils/apiResponse.mjs';
import authService from '../services/auth.service.mjs';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, { req });
  return sendResponse(res, 201, result, 'User registered successfully');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, { req });
  return sendResponse(res, 200, result, 'Login successful');
});

export const getMe = asyncHandler(async (req, res) => {
  if (req.user) {
    return sendResponse(res, 200, { user: req.user }, 'Current user profile fetched successfully');
  }
  const user = await authService.getCurrentUser(req.user?._id || req.user?.id);
  return sendResponse(res, 200, { user }, 'Current user profile fetched successfully');
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const tokens = await authService.refreshAccessToken(refreshToken);
  return sendResponse(res, 200, tokens, 'Token refreshed successfully');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user?._id);
  return sendResponse(res, 200, {}, 'Logged out successfully');
});

export const google = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const result = await authService.googleLogin(credential, { req });
  return sendResponse(res, 200, result, 'Google login successful');
});

export const clerkSync = asyncHandler(async (req, res) => {
  const result = await authService.clerkSync(req.body);
  return sendResponse(res, 200, result, 'Clerk user identity synchronized successfully');
});

export default {
  register,
  login,
  google,
  clerkSync,
  getMe,
  refresh,
  logout
};

