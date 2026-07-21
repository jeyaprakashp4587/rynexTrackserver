import { socketRooms } from "./socket.room.manager.js";
import { registerModuleSockets } from "./socket.routes.js";

export const socketManager = (io) => {
  // console.log("socet manager", io);
  io.on("connection", (socket) => {
    console.log("Socket Connected", socket.id);
    const userId = socket.user.userId;
    // join users
    socket.join(socketRooms.userRoom(userId));
    console.log(`joined room user:${userId}`);
    registerModuleSockets(io, socket);
    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });
  });
};
