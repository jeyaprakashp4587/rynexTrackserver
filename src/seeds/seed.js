import mongoose from "mongoose";
import { DB1 } from "../config/db.js";
import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { Driver } from "../models/Driver.js";
import { Vehicle } from "../models/Vehicle.js";

const seed = async () => {
  try {
    // 🔥 STEP 1: WAIT FOR CONNECTION
    await DB1;

    console.log("✅ DB connected");

    // // 🔥 STEP 2: NOW SAFE TO DROP
    // await DB1.connection.dropDatabase();

    console.log("🔥 DB cleared");

    // =========================
    // USERS
    // =========================
    const ownerUser = await User.create({
      Name: "Arun CEO",
      MobileNumber: "9000000001",
      role: "company",
      password: "123456",
    });

    const normalUser = await User.create({
      Name: "Ravi User",
      MobileNumber: "9000000002",
      role: "user",
      password: "123456",
    });

    // =========================
    // COMPANY
    // =========================
    const company = await Company.create({
      companyName: "Chennai Fast Logistics",
      owner: ownerUser._id,
      address: "Chennai Central",
      GSTNumber: "GST12345",
    });

    // =========================
    // DRIVERS
    // =========================
    const independentDriver = await Driver.create({
      name: "Kumar Independent",
      MobileNumber: "8000000001",
      isIndependentDriver: true,
    });

    const companyDriver1 = await Driver.create({
      name: "Senthil Driver",
      MobileNumber: "8000000002",
      isIndependentDriver: false,
    });

    const companyDriver2 = await Driver.create({
      name: "Rajesh Driver",
      MobileNumber: "8000000003",
      isIndependentDriver: false,
    });

    // =========================
    // VEHICLES (CHENNAI COORDS)
    // =========================
    const vehicle1 = await Vehicle.create({
      vehicleNumber: "TN01AB1111",
      vehicleModel: "Tata Ace",
      vehicleImage: "https://picsum.photos/200",
      currentlyAvailable: true,
      currentDriver: independentDriver._id,
      currentLocation: {
        type: "Point",
        coordinates: [80.2707, 13.0827],
      },
    });

    const vehicle2 = await Vehicle.create({
      vehicleNumber: "TN01AB2222",
      vehicleModel: "Ashok Leyland",
      vehicleImage: "https://picsum.photos/200",
      currentlyAvailable: true,
      currentDriver: companyDriver1._id,
      companyId: company._id,
      currentLocation: {
        type: "Point",
        coordinates: [80.2496, 13.0604],
      },
    });

    const vehicle3 = await Vehicle.create({
      vehicleNumber: "TN01AB3333",
      vehicleModel: "Mini Truck",
      vehicleImage: "https://picsum.photos/200",
      currentlyAvailable: true,
      currentDriver: companyDriver2._id,
      companyId: company._id,
      currentLocation: {
        type: "Point",
        coordinates: [80.2206, 13.0049],
      },
    });

    // =========================
    // LINKING
    // =========================
    await Driver.findByIdAndUpdate(independentDriver._id, {
      vehicles: [vehicle1._id],
    });

    await Driver.findByIdAndUpdate(companyDriver1._id, {
      vehicles: [vehicle2._id],
    });

    await Driver.findByIdAndUpdate(companyDriver2._id, {
      vehicles: [vehicle3._id],
    });

    console.log("✅ SEED DONE");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err);
    process.exit(1);
  }
};

seed();
