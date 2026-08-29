import {
  errorResponse,
  successResponse,
} from "../../../shared/utils/response.js";
import {
  createCompanyDriver,
  getCompanyDrivers,
  getDriverProfile,
  onboardDriver,
} from "../services/driver.service.js";

export const getDriverDetails = async (req, res) => {
  try {
    const driver = await getDriverProfile(req.userId);
    return successResponse({
      res,
      statusCode: 200,
      message: "Fetched driver details successfully",
      data: driver,
    });
  } catch (error) {
    return errorResponse({
      statusCode: error.message === "Driver not found" ? 404 : 500,
      res,
      message: error.message || "Failed to fetch driver details",
    });
  }
};

export const createDriver = async (req, res) => {
  try {
    const driver = await createCompanyDriver(req.body);
    return successResponse({
      res,
      statusCode: 201,
      message: "Driver created successfully",
      data: driver,
    });
  } catch (error) {
    return errorResponse({
      statusCode: error.message ? 400 : 500,
      res,
      message: error.message || "Failed to create driver",
    });
  }
};

export const onBoardingDriver = async (req, res) => {
  try {
    await onboardDriver(req.body);
    return successResponse({
      res,
      statusCode: 201,
      message: "Driver onboarded successfully",
    });
  } catch (error) {
    return errorResponse({
      statusCode: error.message ? 400 : 500,
      res,
      message: error.message || "Failed to onboard driver",
    });
  }
};

export const getMyCompanyDrivers = async (req, res) => {
  try {
    const drivers = await getCompanyDrivers(req.userId);
    return successResponse({
      res,
      statusCode: 200,
      message: "Fetched drivers successfully",
      data: drivers,
    });
  } catch (error) {
    return errorResponse({
      statusCode: 500,
      res,
      message: error.message || "Failed to fetch drivers",
    });
  }
};
