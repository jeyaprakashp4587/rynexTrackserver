import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
if (!process.env.MONGO_URI) {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}
const DbConfig = process.env.MONGO_URI;
if (!DbConfig) {
  throw new Error("MONGO_URI is not configured in backend/.env");
}
const DB1 = mongoose.createConnection(DbConfig, {
  autoIndex: true,
});

DB1.on("connected", () => {
  console.log("DB1 connected successfully");
});

DB1.on("error", (err) => {
  console.error("DB1 connection error:", err?.message || err);
});

export { DB1 };
