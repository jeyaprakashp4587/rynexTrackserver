import mongoose from "mongoose";
import { DB1 } from "../../../../config/db.js";
import { stopsField } from "../shared/stop.schema.js";

const { ObjectId } = mongoose.Schema.Types;

const companyRunStopsSchema = new mongoose.Schema(
  {
    runId: { type: ObjectId, ref: "CompanyRun", required: true },
    stops: stopsField,
  },
  { timestamps: true }
);

companyRunStopsSchema.index({ runId: 1 }, { unique: true });

export const companyRunStops = DB1.model(
  "CompanyRunStops",
  companyRunStopsSchema
);
