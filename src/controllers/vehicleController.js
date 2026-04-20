import { Company } from "../models/Company.js";
import { Vehicle } from "../models/Vehicle.js";

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
export const createDriverVehicle = async (req, res) => {
  try {
    const userId = req.user._id;
    const { vehicleNumber, vehicleImage, vehicleModel } = req.body;
    const newVehicle = new Vehicle({
      vehicleNumber,
      vehicleImage,
      vehicleModel,
    });
    await newVehicle.save();
    await Vehicle.findByIdAndUpdate(newVehicle._id, {
      $push: { drivers: userId },
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
    const company = await Company.findOne({ owner: req.user._id }).populate(
      "vehicles",
    );
    res.status(200).json({ vehicles: company.vehicles });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};
// get my vehicle for driver
export const getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ drivers: req.user._id });
    res.status(200).json({ vehicles });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch vehicles" });
  }
};
