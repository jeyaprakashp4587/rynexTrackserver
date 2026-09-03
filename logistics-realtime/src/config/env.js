import dotenv from "dotenv";

dotenv.config();

const get = (key, fallback) => {
  const val = process.env[key];
  if (val === undefined || val === "") return fallback;
  return val;
};

const env = {
  PORT: Number(get("PORT", 9000)),
  NODE_ENV: get("NODE_ENV", "development"),
  REDIS_URL: get("REDIS_URL", "redis://127.0.0.1:6379"),
  JWT_SECRET: get("JWT_SECRET"),
  CORS_ORIGIN: get("CORS_ORIGIN", "*"),
  HEARTBEAT_TTL: Number(get("HEARTBEAT_TTL", 30)),
  LOCATION_UPDATE_INTERVAL_MS: Number(get("LOCATION_UPDATE_INTERVAL_MS", 5000)),
};

if (!env.JWT_SECRET) {
  console.warn(
    "Warning: JWT_SECRET is not set. Socket auth will fail without a secret in production."
  );
}

export default env;
