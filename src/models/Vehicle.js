import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleImage: {
      type: String,
    },
    vehicleModel: {
      type: String,
    },
    currentlyAvailable: {
      type: Boolean,
      default: true,
    },
    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },

    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
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
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
  },
  {
    timestamps: true,
  }
);

export const Vehicle = DB1.model("Vehicle", vehicleSchema);
