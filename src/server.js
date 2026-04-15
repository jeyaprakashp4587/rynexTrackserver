import "dotenv/config";
import http from "http";
import app from "./app.js";
import { DB1 } from "./config/db.js";
import { initializeFirebaseAdmin } from "./Firebase/firebaseAdmin.js";
import { initializeSocket } from "./sockets/Socket.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    await DB1;
    // initializeFirebaseAdmin();
    initializeSocket(server);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed", error);
    process.exit(1);
  }
};

startServer();
