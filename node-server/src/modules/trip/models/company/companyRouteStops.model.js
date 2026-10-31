import mongoose from "mongoose";
import { DB1 } from "../../../../config/db.js";
import { stopsField } from "../shared/stop.schema.js";

const { ObjectId } = mongoose.Schema.Types;

const companyRouteStopsSchema = new mongoose.Schema(
  {
    routeId: { type: ObjectId, ref: "CompanyTripRoutes", required: true },
    stops: stopsField,
  },
  { timestamps: true }
);

companyRouteStopsSchema.index({ routeId: 1 }, { unique: true });
companyRouteStopsSchema.index({ "stops.coords": "2dsphere" });

export const companyRouteStops = DB1.model(
  "CompanyRouteStops",
  companyRouteStopsSchema
);
