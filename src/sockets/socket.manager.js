import { registerModuleSockets } from "./socket.routes.js";

export const socketManager = (io) => {
  // console.log("socet manager", io);
  io.on("connect", (socket) => {
    console.log("Socket Connected", socket.id);
    registerModuleSockets(io, socket);
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  });
};
