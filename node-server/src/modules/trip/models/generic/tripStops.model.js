import mongoose from "mongoose";
import { DB1 } from "../../../../config/db.js";
import { BSON_TYPE } from "../../constants/shared/trip.constants.js";
import { stopsField } from "../shared/stop.schema.js";

const { ObjectId } = mongoose.Schema.Types;

const tripStopSchema = new mongoose.Schema(
  {
    tripId: { type: ObjectId, ref: "Trip" },
    tripRequestId: { type: ObjectId, ref: "TripRequests" },
    stops: stopsField,
  },
  {
    timestamps: true,
  }
);

tripStopSchema.index(
  { tripId: 1 },
  {
    unique: true,
    partialFilterExpression: { tripId: { $type: BSON_TYPE.OBJECT_ID } },
  }
);
tripStopSchema.index({ tripRequestId: 1 });
tripStopSchema.index({ "stops.coords": "2dsphere" });
tripStopSchema.index({ createdAt: 1 });
tripStopSchema.index({ updatedAt: 1 });

const TripStops = DB1.model("TripStops", tripStopSchema);

export default TripStops;
