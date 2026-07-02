import { geoService } from "../../../Redis/services/geo.service.js";

export const saveDriverLocation = async ({ driverId, longitude, latitude }) => {
  await geoService.updateDriverLocation({ driverId, longitude, latitude });
};
