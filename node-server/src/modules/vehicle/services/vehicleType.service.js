import {
  createVehicleTypeRecord,
  getVehicleTypes,
} from "../repositories/vehicleType.repository.js";

export const createVehicleType = async ({
  name,
  vehicleImage,
  seatCapacity,
}) => {
  if (!name || !String(name).trim()) {
    throw new Error("Vehicle type name is required");
  }

  return createVehicleTypeRecord({
    name: String(name).trim(),
    vehicleImage,
    seatCapacity: Number(seatCapacity || 1),
  });
};

export const listVehicleTypes = async () => {
  return getVehicleTypes();
};
