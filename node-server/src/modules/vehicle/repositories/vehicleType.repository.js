import { VehicleType } from "../models/vehicleType.model.js";

export const createVehicleTypeRecord = async ({
  name,
  vehicleImage,
  seatCapacity,
}) => {
  return VehicleType.create({
    name,
    vehicleImage,
    seatCapacity,
  });
};

export const getVehicleTypes = async () => {
  return VehicleType.find({ isActive: true }).sort({ name: 1 });
};
