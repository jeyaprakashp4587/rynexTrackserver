import mongoose from "mongoose";

export const verifyToken = (req, res, next) => {
  req.userId = req.headers["x-user-id"] || new mongoose.Types.ObjectId().toString();
  next();
};
