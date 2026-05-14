import { Company } from "../models/Company.js";
import { Vehicle } from "../models/Vehicle.js";
import { Driver } from "../models/Driver.js";

export const createCompanyVehicle = async (req, res) => {
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
// this creation for create user non company driver create vehicle of own self
export const createDriverVehicle = async (req, res) => {
  try {
    const userId = req.userId;
    const { vehicleNumber, vehicleImage, vehicleModel } = req.body;
    const newVehicle = new Vehicle({
      vehicleNumber,
      vehicleImage,
      vehicleModel,
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
