import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const driverSchema = new mongoose.Schema({
  name: String,
  MobileNumber: { type: String, unique: true },

  image: String,

  isIndependentDriver: {
    type: Boolean,
    default: true,
  },
  currentlyAvailable: {
    type: Boolean,
    default: true,
  },
  driverUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },
  vehicles: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
  ],
});
export const Driver = DB1.model("Driver", driverSchema);
