import mongoose from "mongoose";
import { DB1 } from "../config/db.js";

const companySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adress: {
      type: String,
    },
    GSTNumber: {
      type: String,
    },
    role: {
      type: String,
      enum: ["company", "driver", "user"],
      default: "user",
    },
    vehicles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
      },
    ],
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

export const Company = DB1.model("Company", companySchema);
