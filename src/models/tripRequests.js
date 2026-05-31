import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const tripRequests = new mongoose.Schema({
  pickupCoords: {
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
  dropCoords: {
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
  pickupLocation: {
    type: String,
    default: "Unknown",
  },
  dropLocation: {
    type: String,
    default: "Unknown",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipients: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      userType: {
        type: String,
        enum: ["DRIVER", "COMPANY_OWNER"],
      },
    },
  ],
  status: {
    type: String,
    enum: ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED", "EXPIRED"],
    default: "PENDING",
  },
  type: {
    type: String,
    enum: ["COMPANY_TRIP", "INDEPENDENT_TRIP"],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tripRequests.index({ pickupCoords: "2dsphere", dropCoords: "2dsphere" });
export default DB1.model("TripRequests", tripRequests);
