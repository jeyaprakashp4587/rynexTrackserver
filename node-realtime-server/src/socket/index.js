import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import env from "../config/env.js";
import { socketAuth } from "./middleware/socket-auth.js";
import onConnection from "./connection.js";
import { logger } from "../utils/logger.js";

export const initSocket = async (httpServer, { pubClient, subClient } = {}) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, methods: ["GET", "POST"] },
  });

  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("socket:adapter", "redis adapter configured");
  }

  io.use((socket, next) => socketAuth(socket, next));

  io.on("connection", (socket) => onConnection(io, socket));

  return io;
};

export default initSocket;
