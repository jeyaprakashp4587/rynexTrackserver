import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import {
  changeAvailabilityStatus as updateVehicleAvailabilityStatus,
  changeTripStatus as updateVehicleTripStatus,
  createDriverVehicle,
  createVehicle,
  findNearbyVehicleOptions,
  getCompanyVehicleList,
  getDriverVehicleList,
} from "../services/vehicle.service.js";

export const createCompanyVehicle = async (req, res) => {
  try {
    const vehicle = await createVehicle({
      vehicleNumber: req.body.vehicleNumber,
      vehicleImage: req.body.vehicleImage,
      vehicleModel: req.body.vehicleModel,
      coordinates: req.body.coordinates,
      pricePerKm: req.body.pricePerKm,
      companyId: req.body.companyId,
      vehicleType: req.body.vehicleType,
    });

    return successResponse({
      res,
      statusCode: 201,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: error.message ? 400 : 500,
      message: error.message || "Failed to create company vehicle",
    });
  }
};

export const getMyCompanyVehicles = async (req, res) => {
  try {
    const vehicles = await getCompanyVehicleList(req.userId);
    return successResponse({
      res,
      statusCode: 200,
      message: "Company vehicles retrieved successfully",
      data: vehicles,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message || "Failed to retrieve company vehicles",
    });
  }
};

export const getMyDriverVehicles = async (req, res) => {
  try {
    const userId = req.userId || req.query.userId || req.body?.userId;

    if (!userId) {
      return errorResponse({
        res,
        statusCode: 400,
        message: "User ID is required to fetch driver vehicles",
      });
    }

    const vehicles = await getDriverVehicleList(userId);
    // console.log("Retrieved vehicles:", vehicles);
    return successResponse({
      res,
      statusCode: 200,
      message: "Driver vehicles retrieved successfully",
      data: vehicles,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message || "Failed to retrieve driver vehicles",
    });
  }
};
// update
export const createDriverVehicleProfile = async (req, res) => {
  try {
    const vehicle = await createDriverVehicle({
      vehicleNumber: req.body.vehicleNumber,
      vehicleImage: req.body.vehicleImage,
      vehicleModel: req.body.vehicleModel,
      coordinates: req.body.coordinates,
      pricePerKm: req.body.pricePerKm,
      userId: req.userId,
      vehicleType: req.body.vehicleType,
    });

    return successResponse({
      res,
      statusCode: 201,
      message: "Driver vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: error.message ? 400 : 500,
      message: error.message || "Failed to create driver vehicle",
    });
  }
};

export const changeAvailabilityStatus = async (req, res) => {
  try {
    const { availability, vehicleId } = req.body;
    await updateVehicleAvailabilityStatus({
      vehicleId,
      newAvailabilityStatus: availability,
    });

    return successResponse({
      res,
      statusCode: 200,
      message: "Vehicle availability status updated successfully",
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message || "Failed to update vehicle availability status",
    });
  }
};

export const changeTripStatus = async (req, res) => {
  try {
    const { tripStatus, vehicleId } = req.body;
    await updateVehicleTripStatus({
      vehicleId,
      newTripStatus: tripStatus,
    });

    return successResponse({
      res,
      statusCode: 200,
      message: "Vehicle trip status updated successfully",
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message || "Failed to update vehicle trip status",
    });
  }
};

export const findNearbyVehicles = async (req, res) => {
  try {
    const vehicles = await findNearbyVehicleOptions({
      lat: req.query.lat,
      lon: req.query.lon,
      radiusKm: req.query.radiusKm,
      vehicleType: req.query.vehicleType,
    });

    return successResponse({
      res,
      statusCode: 200,
      message: "Nearby vehicles retrieved successfully",
      data: vehicles,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message || "Failed to retrieve nearby vehicles",
    });
  }
};
