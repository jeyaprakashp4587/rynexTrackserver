import { tripSocket } from "../modules/trip/sockets/trip.socket.js";

export const registerModuleSockets = (io, socket) => {
  tripSocket(io, socket);
};
