import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { createAccessToken, createRefreshToken } from "../middlewares/JWT.js";
import mongoose from "mongoose";
import { ROLES } from "../shared/constants/role.js";
import { errorResponse, successResponse } from "../shared/utils/response.js";

export const register = async (req, res) => {
  try {
    const { MobileNumber, password, role, Name } = req.body;
    // console.log(MobileNumber, password, role, Name);

    const existingUser = await User.exists({
      MobileNumber: MobileNumber,
    });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Mobile number already registered" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      MobileNumber: MobileNumber,
      password: hashedPassword,
      role: role || ROLES.USER,
      Name: Name,
    });
    const accessToken = await createAccessToken(newUser);
    const refreshToken = await createRefreshToken(newUser);
    successResponse({
      res,
      statusCode: 201,
      message: "Registered successfully",
      data: {
        user: {
          id: newUser._id,
          MobileNumber: newUser.MobileNumber,
          role: newUser.role,
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err) {
    console.error(err);
    errorResponse({ statusCode: 500, res });
  }
};
// login
export const login = async (req, res) => {
  const { MobileNumber, password } = req.body;
  // console.log("trigger", MobileNumber, password);

  try {
    // return;
    if (!MobileNumber || !password) {
      return errorResponse({
        statusCode: 400,
        res,
        message: "Mobile number and Password are required.",
      });
    }

    const findMobileUser = await User.findOne({ MobileNumber });
    // console.log("find user", findMobileUser);

    if (!findMobileUser) {
      console.log("triffet");

      return errorResponse({
        statusCode: 400,
        res,
        message: "Mobile number or Password is incorrect.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      findMobileUser.password
    );

    if (!isPasswordCorrect) {
      return errorResponse({
        statusCode: 401,
        res,
        message: "Mobile number or Password is incorrect.",
      });
    }
    const userData = findMobileUser.toObject();
    delete userData.password;
    const accessToken = await createAccessToken(userData);
    const refreshToken = await createRefreshToken(userData);
    // console.log("user", userData);

    return successResponse({
      res,
      statusCode: 200,
      message: "login successful",
      data: {
        user: userData,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    errorResponse({ statusCode: 500, res });
  }
};
// refresh token
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return errorResponse({
        statusCode: 401,
        res,
        message: "No token provided",
      });
    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decoded.userId);
    if (!user) {
      return errorResponse({ statusCode: 404, res, message: "User not found" });
    }
    const newAccessToken = await createAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return errorResponse({
        statusCode: 403,
        res,
        message: "Invalid or expired refresh token",
      });
    }
    console.error("Refresh token error:", err);
    return errorResponse({ statusCode: 500, res, message: err.message });
  }
};

// get User
export const getMe = async (req, res) => {
  const userId = req.userId;
  // console.log("userid", userId);

  try {
    const userData = await User.findById(userId, { password: 0 });
    if (userData) {
      const accessToken = await createAccessToken(userData);
      const refreshToken = await createRefreshToken(userData);
      // console.log("User data:", userData);
      res
        .status(200)
        .json({ user: userData, tokens: { accessToken, refreshToken } });
    } else {
      return res.status(404).json({ message: "user not found" });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
