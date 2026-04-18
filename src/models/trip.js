import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  startLocation: {
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
  endLocation: {
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  allocatedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },
  allocatedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  isTripEnded: {
    type: Boolean,
    default: false,
  },
  photoProofUrl: {
    type: String,
  },
});

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
