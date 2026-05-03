import jwt from "jsonwebtoken";
import dotEnv from "dotenv";
dotEnv.config();

// create access token
export const createAccessToken = async (user) => {
  const accesstoken = jwt.sign(
    { userId: user.id || user._id, role: user.role },
    process.env.JWT_ACCESS_TOKEN_SECRET,
    {
      expiresIn: "7d",
    }
  );
  return accesstoken;
};

// create refresh token
export const createRefreshToken = async (user) => {
  const refreshToken = jwt.sign(
    { userId: user.id || user._id, role: user.role },
    process.env.JWT_REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
  return refreshToken;
};

// verify token middleware
export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log("toekn", token);

  if (!token) return res.status(401).json({ msg: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(403).json({ msg: "Invalid or expired token" });
  }
};
