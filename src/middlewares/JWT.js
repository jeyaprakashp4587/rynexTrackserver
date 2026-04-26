import jwt from "jsonwebtoken";
import dotEnv from "dotenv";
import { User } from "../models/User.js";
dotEnv.config();

// create access token
export const createAccessToken = async (id) => {
  const accesstoken = jwt.sign(
    { userId: id },
    process.env.JWT_ACCESS_TOKEN_SECRET,
    {
      expiresIn: "1h",
    },
  );
  return accesstoken;
};

// create refresh token
export const createRefreshToken = async (id) => {
  const refreshToken = jwt.sign(
    { userId: id },
    process.env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );
  return refreshToken;
};

// verify token middleware
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ msg: "Invalid or expired token" });
  }
};
