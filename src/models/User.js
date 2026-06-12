import mongoose from "mongoose";
import { DB1 } from "../config/db.js";
import { ROLES } from "../constants/statusConst.js";

const userSchema = new mongoose.Schema(
  {
    Name: {
      type: "String",
    },
    MobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [ROLES.USER, ROLES.DRIVER, ROLES.ADMIN],
      default: ROLES.USER,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = DB1.model("User", userSchema);
