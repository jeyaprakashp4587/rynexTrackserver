import jwt from "jsonwebtoken";
import dotEnv from "dotenv";
import { User } from "../models/User.js";
dotEnv.config();

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

export const createRefreshToken = async (id) => {
  const refreshToken = jwt.sign(
    { userId: id },
    process.env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" },
  );
  return refreshToken;
};
// your User model

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  // console.log(token);

  if (!token) return res.status(401).json({ msg: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded.userId).select("name language");
    if (!user) return res.status(404).json({ msg: "User not found" });
    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ msg: "Invalid or expired token" });
  }
};
