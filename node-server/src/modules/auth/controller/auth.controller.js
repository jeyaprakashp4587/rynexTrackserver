import jwt from "jsonwebtoken";
import { createAccessToken } from "../../../middlewares/JWT.js";
import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import {
  getCurrentUserProfile,
  loginUser,
  registerUser,
} from "../services/auth.service.js";
import { User } from "../models/user.model.js";

export const register = async (req, res) => {
  try {
    const result = await registerUser(req.body);
    return successResponse({
      res,
      statusCode: 201,
      message: "Registered successfully",
      data: result,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode:
        error.message === "Mobile number already registered" ? 400 : 500,
      message: error.message || "Failed to register user",
    });
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);
    return successResponse({
      res,
      statusCode: 200,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: error.message ? 400 : 500,
      message: error.message || "Failed to login",
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return errorResponse({
        statusCode: 401,
        res,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded.userId);
    if (!user) {
      return errorResponse({
        statusCode: 404,
        res,
        message: "User not found",
      });
    }

    const newAccessToken = await createAccessToken(user);
    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return errorResponse({
        statusCode: 403,
        res,
        message: "Invalid or expired refresh token",
      });
    }

    return errorResponse({
      statusCode: 500,
      res,
      message: error.message || "Failed to refresh token",
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const result = await getCurrentUserProfile(req.userId);
    return successResponse({
      res,
      statusCode: 200,
      message: "User fetched successfully",
      data: result,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 404,
      message: error.message || "User not found",
    });
  }
};
