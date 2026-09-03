import jwt from "jsonwebtoken";
import env from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) {
      const err = new Error("Authentication error: token required");
      err.data = { code: "NO_TOKEN" };
      return next(err);
    }

    const payload = jwt.verify(token, env.JWT_SECRET);
    // attach minimal user info
    socket.data.user = {
      id: payload.id || payload.userId,
      role: payload.role || "user",
    };
    return next();
  } catch (err) {
    logger.warn("socket:auth:fail", err.message);
    const e = new Error("Authentication error");
    e.data = { code: "AUTH_FAILED" };
    return next(e);
  }
};

export default socketAuth;
