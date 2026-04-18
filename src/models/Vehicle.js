import mongoose from "mongoose";

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
    drivers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const Vehicle = mongoose.model("Vehicle", vehicleSchema);
