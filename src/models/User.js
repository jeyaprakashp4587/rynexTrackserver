import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const userSchema = new mongoose.Schema(
  {
    MobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["company", "driver", "user"],
      default: "user",
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const User = DB1.model("user", userSchema);
