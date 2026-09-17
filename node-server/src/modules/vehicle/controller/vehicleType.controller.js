import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import {
  createVehicleType,
  listVehicleTypes,
} from "../services/vehicleType.service.js";

export const createVehicleTypeEntry = async (req, res) => {
  try {
    const vehicleType = await createVehicleType({
      name: req.body.name,
      vehicleImage: req.body.vehicleImage,
      seatCapacity: req.body.seatCapacity,
    });

    return successResponse({
      res,
      statusCode: 201,
      message: "Vehicle type created successfully",
      data: vehicleType,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: error.message ? 400 : 500,
      message: error.message || "Failed to create vehicle type",
    });
  }
};

export const getVehicleTypeList = async (req, res) => {
  try {
    const vehicleTypes = await listVehicleTypes();
    return successResponse({
      res,
      statusCode: 200,
      message: "Vehicle types retrieved successfully",
      data: vehicleTypes,
    });
  } catch (error) {
    return errorResponse({
      res,
      statusCode: 500,
      message: error.message || "Failed to retrieve vehicle types",
    });
  }
};
