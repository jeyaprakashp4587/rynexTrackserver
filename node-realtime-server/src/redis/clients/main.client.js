import Redis from "ioredis";
import env from "../../config/env.js";
import { logger } from "../../utils/logger.js";

let mainClient = null;
let pubClient = null;
let subClient = null;

export const createMainClient = async () => {
  if (mainClient) return mainClient;
  mainClient = new Redis(env.REDIS_URL);
  mainClient.on("error", (err) =>
    logger.error("redis:main:error", err.message)
  );
  await mainClient.connect();
  logger.info("redis:main:connected", env.REDIS_URL);
  return mainClient;
};

export const createPubClient = async () => {
  if (pubClient) return pubClient;
  pubClient = new Redis(env.REDIS_URL);
  pubClient.on("error", (err) => logger.error("redis:pub:error", err.message));
  await pubClient.connect();
  logger.info("redis:pub:connected", env.REDIS_URL);
  return pubClient;
};

export const createSubClient = async () => {
  if (subClient) return subClient;
  subClient = new Redis(env.REDIS_URL);
  subClient.on("error", (err) => logger.error("redis:sub:error", err.message));
  await subClient.connect();
  logger.info("redis:sub:connected", env.REDIS_URL);
  return subClient;
};

export default createMainClient;
