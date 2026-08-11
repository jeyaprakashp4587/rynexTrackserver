import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import { DB1 } from "./src/config/db.js";
import { initializeFirebaseAdmin } from "./src/Firebase/firebaseAdmin.js";
import { initSocket } from "./src/config/socket.config.js";
import { socketManager } from "./src/sockets/socket.manager.js";
import { socketAuthMiddleware } from "./src/sockets/socketAuthMiddleware.js";
// import { initializeSocket } from "./sockets/Socket.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    await DB1;
    // init socket
    const io = initSocket(server);
    socketAuthMiddleware(io);
    socketManager(io);
    // close socket
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
    process.exit(1);
  }
};

startServer();
