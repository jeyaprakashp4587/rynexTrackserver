import mongoose from "mongoose";
import { DB1 } from "../../../config/db.js";
import { TRIP_TYPE } from "../../trip/constants/shared/trip.constants.js";

const driverSchema = new mongoose.Schema({
  name: String,
  MobileNumber: { type: String, unique: true },
  image: String,
  isIndependentDriver: {
    type: Boolean,
    default: true,
  },
  availability: {
    type: String,
    enum: ["AVAILABLE", "UNAVAILABLE"],
    default: "AVAILABLE",
  },
  tripStatus: {
    type: String,
    enum: ["IDLE", "ON_TRIP"],
    default: "IDLE",
  },
  activeTrip: {
    activeTripId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    activeTripType: {
      type: String,
      enum: [...Object.values(TRIP_TYPE), "COMPANY", "INDEPENDENT", null],
      default: null,
    },
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
export default Driver;
