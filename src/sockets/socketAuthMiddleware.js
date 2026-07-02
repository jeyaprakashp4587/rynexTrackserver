import jwt from "jsonwebtoken";
import dotEnv from "dotenv";
dotEnv.config();

export const socketAuthMiddleware = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("No token"));
      }
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });
};
