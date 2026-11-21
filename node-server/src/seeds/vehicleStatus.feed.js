import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { DB1 } from "../config/db.js";
import { Vehicle } from "../modules/vehicle/models/vehicle.model.js";
import { VehicleType } from "../modules/vehicle/models/vehicleType.model.js";
import { Driver } from "../modules/driver/models/driver.model.js";

export const feedExistingVehicles = async () => {
  await DB1;
  console.log("Connected to database for vehicle feed...");

  // 1. Ensure VehicleTypes exist in the database
  let vehicleTypes = await VehicleType.find();
  if (vehicleTypes.length === 0) {
    console.log("No VehicleTypes found. Seeding default vehicle types...");
    vehicleTypes = await VehicleType.insertMany([
      {
        name: "Car",
        vehicleImage:
          "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7",
        seatCapacity: 4,
      },
      {
        name: "Tata Ace",
        vehicleImage:
          "https://images.unsplash.com/photo-1553440569-bcc63803a83d",
        seatCapacity: 3,
      },
      {
        name: "Dost",
        vehicleImage:
          "https://images.unsplash.com/photo-1580273916550-e323be2ae537",
        seatCapacity: 2,
      },
      {
        name: "Mini Cab",
        vehicleImage:
          "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
        seatCapacity: 4,
      },
      {
        name: "Passenger Van",
        vehicleImage:
          "https://images.unsplash.com/photo-1511919884226-fd3cad34687c",
        seatCapacity: 10,
      },
      {
        name: "Passenger Auto",
        vehicleImage:
          "https://images.unsplash.com/photo-1552519507-da3b142c6e3d",
        seatCapacity: 3,
      },
    ]);
    console.log(`✅ Seeded ${vehicleTypes.length} vehicle types`);
  }

  const defaultTypeId =
    vehicleTypes.find((vt) => vt.name.toLowerCase() === "car")?._id ||
    vehicleTypes[0]._id;

  // 2. Feed availability and tripStatus
  const statusResult = await Vehicle.updateMany(
    {
      $or: [
        { availability: { $exists: false } },
        { availability: null },
        { availability: { $nin: ["AVAILABLE", "UNAVAILABLE"] } },
        { tripStatus: { $exists: false } },
        { tripStatus: null },
        { tripStatus: { $nin: ["IDLE", "ON_TRIP"] } },
      ],
    },
    [
      {
        $set: {
          availability: {
            $cond: {
              if: { $in: ["$availability", ["AVAILABLE", "UNAVAILABLE"]] },
              then: "$availability",
              else: "AVAILABLE",
            },
          },
          tripStatus: {
            $cond: {
              if: { $in: ["$tripStatus", ["IDLE", "ON_TRIP"]] },
              then: "$tripStatus",
              else: "IDLE",
            },
          },
        },
      },
    ]
  );

  // 3. Feed currentDriver by mapping from Driver.vehicles
  const driversWithVehicles = await Driver.find({
    vehicles: { $exists: true, $ne: [] },
  }).select("_id vehicles");

  let driverLinkedCount = 0;
  for (const driver of driversWithVehicles) {
    if (Array.isArray(driver.vehicles) && driver.vehicles.length > 0) {
      const res = await Vehicle.updateMany(
        {
          _id: { $in: driver.vehicles },
          $or: [{ currentDriver: { $exists: false } }, { currentDriver: null }],
        },
        { $set: { currentDriver: driver._id } }
      );
      driverLinkedCount += res.modifiedCount;
    }
  }

  // 4. Feed vehicleType: match by vehicleModel first
  let matchedTypeCount = 0;
  for (const vt of vehicleTypes) {
    const res = await Vehicle.updateMany(
      {
        $or: [{ vehicleType: { $exists: false } }, { vehicleType: null }],
        vehicleModel: { $regex: new RegExp(vt.name, "i") },
      },
      { $set: { vehicleType: vt._id } }
    );
    matchedTypeCount += res.modifiedCount;
  }

  // Fallback for remaining vehicles without vehicleType
  const fallbackTypeRes = await Vehicle.updateMany(
    {
      $or: [{ vehicleType: { $exists: false } }, { vehicleType: null }],
    },
    { $set: { vehicleType: defaultTypeId } }
  );

  // 5. Ensure currentLocation is a valid GeoJSON Point for 2dsphere index
  const locationRes = await Vehicle.updateMany(
    {
      $or: [
        { currentLocation: { $exists: false } },
        { currentLocation: null },
        { "currentLocation.coordinates": { $exists: false } },
        { "currentLocation.coordinates": null },
        { "currentLocation.coordinates": { $size: 0 } },
      ],
    },
    {
      $set: {
        currentLocation: {
          type: "Point",
          coordinates: [0, 0],
        },
      },
    }
  );

  // 6. Remove obsolete currentlyAvailable field from all vehicles
  const cleanupRes = await Vehicle.updateMany(
    { currentlyAvailable: { $exists: true } },
    { $unset: { currentlyAvailable: "" } }
  );

  console.log(`✅ Vehicle feed summary:`);
  console.log(
    `- Availability & TripStatus: ${statusResult.matchedCount} matched, ${statusResult.modifiedCount} updated`
  );
  console.log(`- CurrentDriver linked: ${driverLinkedCount} vehicles updated`);
  console.log(
    `- VehicleType assigned: ${
      matchedTypeCount + fallbackTypeRes.modifiedCount
    } updated (${matchedTypeCount} matched by model, ${
      fallbackTypeRes.modifiedCount
    } defaulted)`
  );
  console.log(
    `- Location normalized: ${locationRes.modifiedCount} vehicles updated`
  );
  console.log(
    `- Obsolete currentlyAvailable cleaned up: ${cleanupRes.modifiedCount} vehicles updated`
  );

  return {
    statusResult,
    driverLinkedCount,
    vehicleTypeCount: matchedTypeCount + fallbackTypeRes.modifiedCount,
    locationCount: locationRes.modifiedCount,
    cleanupCount: cleanupRes.modifiedCount,
  };
};

if (
  process.argv[1]?.includes("vehicleStatus.feed.js") ||
  process.argv[1]?.includes("vehicle.feed.js")
) {
  feedExistingVehicles()
    .then(() => DB1.close())
    .then(() => process.exit(0))
    .catch(async (error) => {
      console.error("❌ Vehicle feed error:", error);
      await DB1.close().catch(() => {});
      process.exit(1);
    });
}
