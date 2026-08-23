import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      allowedHeaders: ["Authorization", "Content-Type"],
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });
  return io;
};

export const getIO = () => io;
