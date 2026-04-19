import { Company } from "../models/Company.js";

export const createVehicle = async (req, res) => {
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
