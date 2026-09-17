import mongoose from "mongoose";

export const buildNearbyVehiclesPipeline = ({ lat, lon, radiusKm = 50, vehicleType }) => {
  const maxDistance = Number(radiusKm) * 1000;
  const pipeline = [
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
  ];

  if (vehicleType) {
    pipeline.push({
      $match: {
        vehicleType: new mongoose.Types.ObjectId(String(vehicleType)),
      },
    });
  }

  pipeline.push(
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
      $lookup: {
        from: "vehicletype",
        localField: "vehicleType",
        foreignField: "_id",
        as: "vehicleTypeInfo",
      },
    },
    {
      $unwind: {
        path: "$vehicleTypeInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: "$_id",
        vehicleId: "$_id",
        vehicleNumber: 1,
        vehicleModel: 1,
        vehicleImage: 1,
        vehicleType: { $ifNull: ["$vehicleTypeInfo._id", "$vehicleType"] },
        vehicleTypeName: { $ifNull: ["$vehicleTypeInfo.name", null] },
        seatCapacity: { $ifNull: ["$vehicleTypeInfo.seatCapacity", 1] },
        currentLocation: 1,
        distanceKm: {
          $round: [{ $divide: ["$distanceInMeters", 1000] }, 2],
        },
        driverId: { $ifNull: ["$driver._id", null] },
        driverUserId: { $ifNull: ["$driver.driverUserId", null] },
        driverName: { $ifNull: ["$driver.name", null] },
        driverImage: { $ifNull: ["$driver.image", null] },
        driverMobile: { $ifNull: ["$driver.MobileNumber", null] },
        isIndependentDriver: {
          $ifNull: ["$driver.isIndependentDriver", false],
        },
        companyId: { $ifNull: ["$company._id", null] },
        companyName: { $ifNull: ["$company.companyName", null] },
        ownerId: { $ifNull: ["$owner._id", null] },
        ownerName: { $ifNull: ["$owner.Name", null] },
        ownerMobile: { $ifNull: ["$owner.MobileNumber", null] },
        userId: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $ifNull: ["$company", null] }, null] },
                then: "$driver.driverUserId",
              },
              {
                case: { $eq: ["$driver.isIndependentDriver", true] },
                then: "$driver.driverUserId",
              },
            ],
            default: "$owner._id",
          },
        },
        pricePerKm: { $ifNull: ["$pricePerKm", 0] },
        bookingType: {
          $switch: {
            branches: [
              {
                case: { $eq: [{ $ifNull: ["$driver", null] }, null] },
                then: "VEHICLE_ONLY",
              },
              {
                case: { $eq: [{ $ifNull: ["$company", null] }, null] },
                then: "INDEPENDENT_TRIP",
              },
              {
                case: { $eq: ["$driver.isIndependentDriver", true] },
                then: "INDEPENDENT_TRIP",
              },
            ],
            default: "COMPANY_TRIP",
          },
        },
      },
    },
    {
      $sort: { distanceKm: 1 },
    },
  );

  return pipeline;
};
