import mongoose from "mongoose";
import {
  GEO_POINT_TYPE,
  TRIP_STOP_STATUS,
  TRIP_STOP_TYPE,
} from "../../constants/shared/trip.constants.js";
import { TRIP_ERRORS } from "../../constants/generic/trip.messages.js";

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

export const stopSchema = new mongoose.Schema({
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

export const stopsField = {
  type: [stopSchema],
  default: [],
  validate: {
    validator: (value) => value.length > 0,
    message: TRIP_ERRORS.STOP_REQUIRED,
  },
};
