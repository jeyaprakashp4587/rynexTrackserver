import mongoose from "mongoose";
import { DB1 } from "../config/db.js";
import { TRIP_STOP_STATUS, TRIP_STOP_TYPE } from "../constants/statusConst.js";

const stopSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
    },
    stopType: {
      type: String,
      enum: [TRIP_STOP_TYPE.PICKUP, TRIP_STOP_TYPE.DROP],
      required: true,
    },
    status: {
      type: String,
      enum: [
        TRIP_STOP_STATUS.PENDING,
        TRIP_STOP_STATUS.ARRIVED,
        TRIP_STOP_STATUS.COMPLETED,
        TRIP_STOP_STATUS.FAILED,
        TRIP_STOP_STATUS.SKIPPED,
      ],
      default: TRIP_STOP_STATUS.PENDING,
    },
    locationName: {
      type: String,
      default: "",
    },
    coords: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lon, lat]
        required: true,
      },
    },
    contactPerson: {
      type: String,
      default: "",
    },
    contactPhone: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
      default: "",
    },
    proofPhotos: {
      type: [String],
      default: [],
    },
    arrivedAt: Date,
    completedAt: Date,
  },
  {
    _id: true,
  }
);

const tripStopSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      // required: true,
      // unique: true,
    },

    tripRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripRequests",
      // required: true,
    },

    stops: {
      type: [stopSchema],
      default: [],
      validate: {
        validator: function (value) {
          return value.length > 0;
        },
        message: "At least one stop is required",
      },
    },
  },
  {
    timestamps: true,
  }
);

// tripStopSchema.index({ tripId: 1 });

tripStopSchema.index({ tripRequestId: 1 });

tripStopSchema.index({
  "stops.coords": "2dsphere",
});

tripStopSchema.index({
  createdAt: 1,
});

tripStopSchema.index({
  updatedAt: 1,
});

export const TripStops = DB1.model("TripStops", tripStopSchema);
