import { registerModuleSockets } from "./socket.routes.js";

export const socketManager = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket Connected", socket.id);

    registerModuleSockets(io, socket);

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  });
};
