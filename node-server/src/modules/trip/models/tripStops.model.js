import mongoose from "mongoose";
import { DB1 } from "../../../config/db.js";
import {
  GEO_POINT_TYPE,
  TRIP_STOP_STATUS,
  TRIP_STOP_TYPE,
} from "../constants/trip.constants.js";
import { TRIP_ERRORS } from "../constants/trip.messages.js";

const { ObjectId } = mongoose.Schema.Types;

const recipientMetaSchema = new mongoose.Schema({
  recipientId: { type: ObjectId },
  status: {
    type: String,
    enum: Object.values(TRIP_STOP_STATUS),
    default: TRIP_STOP_STATUS.PENDING,
  },
  contactPerson: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  notes: { type: String, default: "" },
  otp: { type: String, default: "" },
  proofPhotos: { type: [String], default: [] },
  arrivedAt: Date,
  completedAt: Date,
});

const stopSchema = new mongoose.Schema({
  sequence: { type: Number, required: true },
  stopType: {
    type: String,
    enum: Object.values(TRIP_STOP_TYPE),
    required: true,
  },
  locationName: { type: String, default: "" },
  coords: {
    type: {
      type: String,
      enum: [GEO_POINT_TYPE],
      default: GEO_POINT_TYPE,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  contactPerson: { type: String, default: "" },
  contactPhone: { type: String, default: "" },
  recipientsMeta: [recipientMetaSchema],
});

const tripStopSchema = new mongoose.Schema(
  {
    tripId: { type: ObjectId, ref: "Trip" },
    tripRequestId: { type: ObjectId, ref: "TripRequests" },
    companyTripId: { type: ObjectId, ref: "CompanyTripRoutes" },
    stops: {
      type: [stopSchema],
      default: [],
      validate: {
        validator: (value) => value.length > 0,
        message: TRIP_ERRORS.STOP_REQUIRED,
      },
    },
  },
  {
    timestamps: true,
  }
);

tripStopSchema.index({ tripId: 1 });
tripStopSchema.index({ tripRequestId: 1 });
tripStopSchema.index({ companyTripId: 1 });
tripStopSchema.index({ "stops.coords": "2dsphere" });
tripStopSchema.index({ createdAt: 1 });
tripStopSchema.index({ updatedAt: 1 });

const TripStops = DB1.model("TripStops", tripStopSchema);

export default TripStops;
