import { Company } from "../models/Company.js";
import { Vehicle } from "../models/Vehicle.js";
import { Driver } from "../models/Driver.js";
import { toMeters } from "../helpers/radiusHelper.js";

export const createCompanyVehicle = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { vehicleNumber, vehicleImage, vehicleModel } = req.body;
    const newVehicle = new Vehicle({
      vehicleNumber,
      vehicleImage,
      vehicleModel,
    });
    await newVehicle.save();
    await Company.findByIdAndUpdate(companyId, {
      $push: { vehicles: newVehicle._id },
    });
    // Logic to create a vehicle in the database
    res.status(201).json({ message: "Vehicle created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create vehicle" });
  }
};
// this creation for create user non company driver create vehicle of own self
export const createDriverVehicle = async (req, res) => {
  try {
    const userId = req.userId;
    const { vehicleNumber, vehicleImage, vehicleModel } = req.body;
    const newVehicle = new Vehicle({
      vehicleNumber,
      vehicleImage,
      vehicleModel,
    });
    await newVehicle.save();
    await Driver.findByIdAndUpdate(userId, {
      $push: { vehicles: newVehicle._id },
    });
    await Vehicle.findByIdAndUpdate(newVehicle._id, {
      currentDriver: userId,
    });
    // Logic to create a vehicle in the database
    res.status(201).json({ message: "Vehicle created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create vehicle" });
  }
};
// get my company vehicles
export const getMyCompanyVehicles = async (req, res) => {
  try {
    const userId = req.userId;
    const company = await Company.findOne({ owner: userId }).populate(
      "vehicles",
      { vehicleNumber: 1, vehicleImage: 1, vehicleModel: 1 }
    );
    res.status(200).json({ vehicles: company.vehicles });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};
// get my vehicle for driver
export const getMyVehicles = async (req, res) => {
  try {
    const userId = req.userId;
    const vehicles = await Vehicle.find({ currentDriver: userId });
    res.status(200).json({ vehicles });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};

export const findNearbyVehicles = async (req, res) => {
  try {
    const { lat, lng, radiusKm } = req.body;

    const maxDistance = toMeters(radiusKm);

    const data = await Vehicle.aggregate([
      // 🔥 GEO SEARCH
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: "distance",
          maxDistance: maxDistance,
          spherical: true,
          query: {
            currentlyAvailable: true,
          },
        },
      },

      // 🔥 DRIVER
      {
        $lookup: {
          from: "drivers",
          localField: "currentDriver",
          foreignField: "_id",
          as: "driver",
        },
      },
      { $unwind: "$driver" },

      // 🔥 COMPANY
      {
        $lookup: {
          from: "companies",
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      {
        $unwind: {
          path: "$company",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔥 OWNER (user)
      {
        $lookup: {
          from: "users",
          localField: "company.owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      {
        $unwind: {
          path: "$owner",
          preserveNullAndEmptyArrays: true,
        },
      },

      // 🔥 FINAL FLAT SHAPE
      {
        $project: {
          // 🚗 VEHICLE
          vehicleImage: 1,
          vehicleModel: 1,
          vehicleNumber: 1,
          currentLocation: 1,
          distance: 1,

          // 👨 DRIVER (always included)
          driverName: "$driver.name",
          driverMobile: "$driver.MobileNumber",

          // 🏢 COMPANY (only if exists)
          companyName: "$company.companyName",

          // 👤 OWNER (only if exists)
          ownerName: "$owner.Name",
          ownerMobile: "$owner.MobileNumber",

          // 🔥 TYPE FLAG
          type: {
            $cond: {
              if: "$driver.isIndependentDriver",
              then: "independent",
              else: "company",
            },
          },
        },
      },
    ]);

    return res.json({
      success: true,
      radiusKm: toKm(maxDistance),
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
