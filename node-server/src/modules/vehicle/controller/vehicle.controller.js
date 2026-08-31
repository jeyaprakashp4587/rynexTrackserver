import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import {
  createDriverVehicle,
  createVehicle,
  findNearbyVehicleOptions,
  getCompanyVehicleList,
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

export const createDriverVehicleProfile = async (req, res) => {
  try {
    const vehicle = await createDriverVehicle({
      vehicleNumber: req.body.vehicleNumber,
      vehicleImage: req.body.vehicleImage,
      vehicleModel: req.body.vehicleModel,
      coordinates: req.body.coordinates,
      pricePerKm: req.body.pricePerKm,
      userId: req.userId,
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

export const findNearbyVehicles = async (req, res) => {
  try {
    const vehicles = await findNearbyVehicleOptions({
      lat: req.query.lat,
      lon: req.query.lon,
      radiusKm: req.query.radiusKm,
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
