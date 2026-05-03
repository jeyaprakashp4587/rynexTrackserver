import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    MobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    image: {
      type: String,
    },
    // password: {
    //   type: String,
    //   required: true,
    // },
    currentlyAvailable: {
      type: Boolean,
      default: true,
    },
    vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);
driverSchema.index({ currentLocation: "2dsphere" });

export const Driver = DB1.model("Driver", driverSchema);
