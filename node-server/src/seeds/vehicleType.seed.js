import { DB1 } from "../config/db.js";
import { VehicleType } from "../modules/vehicle/models/vehicleType.model.js";

export const seedVehicleTypes = async () => {
  await DB1;

  const vehicleTypes = [
    {
      name: "Car",
      vehicleImage:
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7",
      seatCapacity: 4,
    },
    {
      name: "Tata Ace",
      vehicleImage: "https://images.unsplash.com/photo-1553440569-bcc63803a83d",
      seatCapacity: 3,
    },
    {
      name: "Dost",
      vehicleImage:
        "https://images.unsplash.com/photo-1580273916550-e323be2ae537",
      seatCapacity: 2,
    },
    {
      name: "Mini Cab",
      vehicleImage: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
      seatCapacity: 4,
    },
    {
      name: "Passenger Van",
      vehicleImage:
        "https://images.unsplash.com/photo-1511919884226-fd3cad34687c",
      seatCapacity: 10,
    },
    {
      name: "Passenger Auto",
      vehicleImage: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d",
      seatCapacity: 3,
    },
  ];

  await VehicleType.deleteMany({});
  const createdVehicleTypes = await VehicleType.insertMany(vehicleTypes);

  console.log(`✅ Seeded ${createdVehicleTypes.length} vehicle types`);
  return createdVehicleTypes;
};

if (process.argv[1]?.includes("vehicleType.seed.js")) {
  seedVehicleTypes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Vehicle type seed error:", error);
      process.exit(1);
    });
}
