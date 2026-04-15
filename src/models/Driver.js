import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
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

export const Driver = mongoose.model("Driver", driverSchema);
