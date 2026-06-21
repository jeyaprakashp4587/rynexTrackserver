import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { Driver } from "../models/Driver.js";
import { errorResponse, successResponse } from "../shared/utils/response.js";

// create driver for my company
export const createDriver = async (req, res) => {
  try {
    const { companyId, driverForm } = req.body;
    const { name, MobileNumber, image, vehicleId } = driverForm;

    if (!name || !MobileNumber) {
      errorResponse({
        statusCode: 400,
        res,
        message: "Name and MobileNumber are required",
      });
      return;
    }

    // return;
    const newDriver = await Driver.create({
      name,
      MobileNumber,
      image,
      companyId,
      isIndependentDriver: false,
    });

    if (companyId) {
      await Company.findByIdAndUpdate(companyId, {
        $push: { drivers: newDriver._id },
      });
    }
    successResponse({
      res,
      statusCode: 201,
      message: "Driver created successfully",
      data: newDriver,
    });
    return;
  } catch (error) {
    console.error(error);
    return errorResponse({
      statusCode: 500,
      res,
      message: "Failed to create driver",
    });
  }
};
// create driver onboarding self register
export const onBoardingDriver = async (req, res) => {
  try {
    const { name, MobileNumber, image, coordinates } = req.body;
    if (!name || !MobileNumber) {
      return errorResponse({
        statusCode: 400,
        message: "Name and MobileNumber are required",
      });
    }

    await Driver.create({
      name,
      MobileNumber,
      // image,
      currentLocation: {
        type: "Point",
        coordinates: coordinates || [0, 0],
      },
    });
    res.status(201).json({
      success: true,
      // message: "Driver created successfully",
      // driver: newDriver,
    });
  } catch (error) {
    console.error(error);
    return errorResponse({
      statusCode: 500,
      res,
      message: "Failed to create driver",
    });
  }
};
// get my company drivers
export const getMyCompanyDrivers = async (req, res) => {
  try {
    const userId = req.userId;
    const company = await Company.findOne({ owner: userId }).populate(
      "drivers",
      {
        name: 1,
        MobileNumber: 1,
        image: 1,
        driverUserId: 1,
        currentlyAvailable: 1,
      }
    );
    // console.log(company.drivers);
    successResponse({
      res,
      statusCode: 200,
      message: "Fetched drivers successfully",
      data: company.drivers,
    });
  } catch (error) {
    return errorResponse({
      statusCode: 500,
      res,
      message: "Failed to fetch drivers",
    });
  }
};
