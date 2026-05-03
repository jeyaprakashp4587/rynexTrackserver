import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { createAccessToken, createRefreshToken } from "../middlewares/JWT.js";
import mongoose from "mongoose";

export const register = async (req, res) => {
  try {
    const { MobileNumber, password, role } = req.body;
    console.log(MobileNumber, password, role);

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
      role: role || "user",
    });
    const accessToken = await createAccessToken(newUser);
    const refreshToken = await createRefreshToken(newUser);

    res.status(201).json({
      message: "Register succesfully",
      user: {
        id: newUser._id,
        MobileNumber: newUser.MobileNumber,
        role: newUser.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
// login
export const login = async (req, res) => {
  const { MobileNumber, password } = req.body;
  console.log("trigger", MobileNumber, password);

  try {
    // return;
    if (!MobileNumber || !password) {
      return res
        .status(400)
        .json({ error: "Mobile number and Password are required." });
    }

    const findMobileUser = await User.findOne({ MobileNumber });
    console.log("find user", findMobileUser);

    if (!findMobileUser) {
      console.log("triffet");

      return res
        .status(400)
        .json({ error: "Mobile number or Password is incorrect." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      findMobileUser.password
    );

    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ error: "Mobile number or Password is incorrect." });
    }
    const userData = findMobileUser.toObject();
    delete userData.password;
    const accessToken = await createAccessToken(userData);
    const refreshToken = await createRefreshToken(userData);
    console.log("user", userData);

    res.status(200).json({
      message: "login successful",
      user: userData,
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
// refresh token
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ msg: "No token provided" });
    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const newAccessToken = await createAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(403).json({ msg: "Invalid or expired refresh token" });
    }
    console.error("Refresh token error:", err);
    res.status(500).json({ error: err.message });
  }
};

// get User
export const getMe = async (req, res) => {
  const userId = req.userId;
  console.log("userid", userId);

  try {
    const userData = await User.findById(userId, { password: 0 });
    if (userData) {
      const accessToken = await createAccessToken(userData);
      const refreshToken = await createRefreshToken(userData);
      console.log("User data:", userData);
      res
        .status(200)
        .json({ user: userData, tokens: { accessToken, refreshToken } });
    } else {
      res.status(404).json({ message: "user not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
