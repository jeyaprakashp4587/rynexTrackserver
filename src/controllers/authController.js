import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { createAccessToken, createRefreshToken } from "../middlewares/JWT.js";

export const register = async (req, res) => {
  try {
    const { MobileNumber, password, role } = req.body;
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
    const accessToken = await createAccessToken(newUser._id);
    const refreshToken = await createRefreshToken(newUser._id);

    res.status(201).json({
      message: "Register succesfully",
      user: {
        id: newUser._id,
        MobileNumber: newUser.MobileNumber,
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
// login
export const login = async (req, res) => {
  const { MobileNumber, password } = req.body;
  try {
    // return;
    if (!MobileNumber || !password) {
      return res
        .status(400)
        .json({ error: "Mobile number and Password are required." });
    }

    const findMobileUser = await User.findOne({ MobileNumber });

    if (!findMobileUser) {
      return res
        .status(400)
        .json({ error: "Mobile number or Password is incorrect." });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      findMobileUser.password,
    );

    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ error: "Mobile number or Password is incorrect." });
    }
    const userData = findMobileUser.toObject();
    delete userData.password;
    const accessToken = await createAccessToken(userData._id);
    const refreshToken = await createRefreshToken(userData._id);

    res.json({
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
      process.env.JWT_REFRESH_TOKEN_SECRET,
    );
    // Create a new access token (await the async function)
    const newAccessToken = await createAccessToken(decoded.userId);
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
  const { userId } = req.params;
  try {
    const userData = await User.findById(userId, { password: 0 });
    if (userData) {
      const accessToken = await createAccessToken(userData._id);
      const refreshToken = await createRefreshToken(userData._id);
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
