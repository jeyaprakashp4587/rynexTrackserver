import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { Driver } from "../models/Driver.js";

export const createDriver = async (req, res) => {
  try {
    const { name, MobileNumber, image } = req.body;
    const { companyId } = req.params;

    if (!name || !MobileNumber) {
      return res.status(400).json({
        success: false,
        message: "Name, MobileNumber and password are required",
      });
    }

    const newDriver = await Driver.create({
      name,
      MobileNumber,
      image,
    });

    await Company.findByIdAndUpdate(companyId, {
      $push: { drivers: newDriver._id },
    });

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
