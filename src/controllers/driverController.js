import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { Driver } from "../models/Driver.js";

// create driver for my company
export const createDriver = async (req, res) => {
  try {
    const { name, MobileNumber, image, coordinates } = req.body;
    const { companyId } = req.params;

    if (!name || !MobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Name and MobileNumber are required",
      });
    }

    const newDriver = await Driver.create({
      name,
      MobileNumber,
      image,
      currentLocation: {
        type: "Point",
        coordinates: coordinates || [0, 0],
      },
    });

    if (companyId) {
      await Company.findByIdAndUpdate(companyId, {
        $push: { drivers: newDriver._id },
      });
    }

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      driver: newDriver,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
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
      { name: 1, MobileNumber: 1, image: 1 }
    );
    res.status(200).json({ drivers: company.drivers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch drivers" });
  }
};
