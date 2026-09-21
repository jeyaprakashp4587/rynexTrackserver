import "dotenv/config";
import http from "http";
import app from "./src/app.js";
import { DB1 } from "./src/config/db.js";
import { initializeFirebaseAdmin } from "./src/Firebase/firebaseAdmin.js";
import { initKafka } from "./src/kafka/index.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const startServer = async () => {
  try {
    await DB1;

    try {
      await initKafka();
      console.log("Kafka initialized");
    } catch (kErr) {
      console.warn("Kafka initialization failed:", kErr.message || kErr);
    }
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
