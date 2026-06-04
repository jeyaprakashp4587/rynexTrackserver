import { Company } from "../models/Company.js";
import { Vehicle } from "../models/Vehicle.js";
import { Driver } from "../models/Driver.js";

export const createCompanyVehicle = async (req, res) => {
  try {
    const {
      vehicleNumber,
      vehicleImage,
      vehicleModel,
      coordinates,
      companyId,
    } = req.body;
    console.log("Creating vehicle with coordinates:", coordinates);

    const userId = req.userId;
    console.log("Creating vehicle for company:", userId);

    const newVehicle = new Vehicle({
      vehicleNumber,
      // vehicleImage,
      vehicleModel,
      companyId,
      currentLocation: {
        type: "Point",
        coordinates: coordinates || [0, 0],
      },
    });
    await newVehicle.save();
    await Company.findOneAndUpdate(
      { owner: userId },
      {
        $push: { vehicles: newVehicle._id },
      },
      { new: true }
    );

    // Logic to create a vehicle in the database
    res
      .status(201)
      .json({ message: "Vehicle created successfully", vehicle: newVehicle });
  } catch (error) {
    res.status(500).json({ error: "Failed to create vehicle" });
  }
};
// this creation for create user non company driver create vehicle of own self
export const createDriverVehicle = async (req, res) => {
  try {
    const userId = req.userId;
    const { vehicleNumber, vehicleImage, vehicleModel, coordinates } = req.body;
    const newVehicle = new Vehicle({
      vehicleNumber,
      vehicleImage,
      vehicleModel,
      currentLocation: {
        type: "Point",
        coordinates: coordinates || [0, 0],
      },
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
    console.log("userId:", userId);

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

// export const findNearbyVehicles = async (req, res) => {
//   try {
//     const { lat, lon, radiusKm = 10 } = req.query;
//     console.log(lat, lon, radiusKm);

//     const maxDistance = toMeters(radiusKm);

//     const data = await Vehicle.aggregate([
//       // 🔥 GEO SEARCH
//       {
//         $geoNear: {
//           near: {
//             type: "Point",
//             coordinates: [Number(lon), Number(lat)],
//           },
//           distanceField: "distance",
//           maxDistance: maxDistance,
//           spherical: true,
//           query: {
//             currentlyAvailable: true,
//           },
//         },
//       },

//       // 🔥 DRIVER
//       {
//         $lookup: {
//           from: "drivers",
//           localField: "currentDriver",
//           foreignField: "_id",
//           as: "driver",
//         },
//       },
//       { $unwind: "$driver" },

//       // 🔥 COMPANY
//       {
//         $lookup: {
//           from: "companies",
//           localField: "companyId",
//           foreignField: "_id",
//           as: "company",
//         },
//       },
//       {
//         $unwind: {
//           path: "$company",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // 🔥 OWNER (user)
//       {
//         $lookup: {
//           from: "users",
//           localField: "company.owner",
//           foreignField: "_id",
//           as: "owner",
//         },
//       },
//       {
//         $unwind: {
//           path: "$owner",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       // 🔥 FINAL FLAT SHAPE
//       {
//         $project: {
//           // 🚗 VEHICLE
//           vehicleImage: 1,
//           vehicleModel: 1,
//           vehicleNumber: 1,
//           currentLocation: 1,
//           distance: 1,

//           // 👨 DRIVER (always included)
//           driverName: "$driver.name",
//           driverMobile: "$driver.MobileNumber",

//           // 🏢 COMPANY (only if exists)
//           companyName: "$company.companyName",

//           // 👤 OWNER (only if exists)
//           ownerName: "$owner.Name",
//           ownerMobile: "$owner.MobileNumber",

//           // 🔥 TYPE FLAG
//           type: {
//             $cond: {
//               if: "$driver.isIndependentDriver",
//               then: "independent",
//               else: "company",
//             },
//           },
//         },
//       },
//     ]);

//     return res.json({
//       success: true,
//       radiusKm: toKm(maxDistance),
//       count: data.length,
//       data,
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

export const findNearbyVehicles = async (req, res) => {
  try {
    const { lat, lon, radiusKm = 50 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const maxDistance = Number(radiusKm) * 1000;

    const vehicles = await Vehicle.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lon), Number(lat)],
          },
          distanceField: "distanceInMeters",
          spherical: true,
          maxDistance,
          query: {
            currentlyAvailable: true,
          },
        },
      },
      {
        $lookup: {
          from: "drivers",
          localField: "currentDriver",
          foreignField: "_id",
          as: "driver",
        },
      },

      {
        $unwind: {
          path: "$driver",
          preserveNullAndEmptyArrays: true,
        },
      },

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

      {
        $project: {
          _id: 0,

          vehicleId: "$_id",
          vehicleNumber: 1,
          vehicleModel: 1,
          vehicleImage: 1,
          currentLocation: 1,

          distanceKm: {
            $round: [
              {
                $divide: ["$distanceInMeters", 1000],
              },
              2,
            ],
          },

          driverId: {
            $ifNull: ["$driver._id", null],
          },
          driverUserId: {
            $ifNull: ["$driver.driverUserId", null],
          },
          driverName: {
            $ifNull: ["$driver.name", null],
          },

          driverImage: {
            $ifNull: ["$driver.image", null],
          },

          driverMobile: {
            $ifNull: ["$driver.MobileNumber", null],
          },

          isIndependentDriver: {
            $ifNull: ["$driver.isIndependentDriver", false],
          },

          companyId: {
            $ifNull: ["$company._id", null],
          },

          companyName: {
            $ifNull: ["$company.companyName", null],
          },

          ownerId: {
            $ifNull: ["$owner._id", null],
          },

          ownerName: {
            $ifNull: ["$owner.Name", null],
          },

          ownerMobile: {
            $ifNull: ["$owner.MobileNumber", null],
          },

          bookingType: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ["$currentDriver", null],
                  },
                  then: "VEHICLE_ONLY",
                },
                {
                  case: {
                    $eq: ["$driver.isIndependentDriver", true],
                  },

                  then: "INDEPENDENT_TRIP",
                },
              ],
              default: "COMPANY_TRIP",
            },
          },
        },
      },

      {
        $sort: {
          distanceKm: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles,
    });
  } catch (error) {
    console.error("findNearbyVehicles:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nearby vehicles",
    });
  }
};
