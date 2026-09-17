import mongoose from "mongoose";
import { DB1 } from "../../../config/db.js";

const vehicleTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleImage: {
      type: String,
      default: "",
    },
    seatCapacity: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const VehicleType = DB1.model("VehicleType", vehicleTypeSchema);
export default VehicleType;
