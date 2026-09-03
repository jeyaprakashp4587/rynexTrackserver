import { createClient } from "redis";
import env from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export const createMainClient = async () => {
  const client = createClient({ url: env.REDIS_URL });
  client.on("error", (err) => logger.error("redis:main:error", err.message));
  await client.connect();
  logger.info("redis:main:connected", env.REDIS_URL);
  return client;
};

export const createPubClient = async () => {
  const client = createClient({ url: env.REDIS_URL });
  client.on("error", (err) => logger.error("redis:pub:error", err.message));
  await client.connect();
  logger.info("redis:pub:connected", env.REDIS_URL);
  return client;
};

export const createSubClient = async () => {
  const client = createClient({ url: env.REDIS_URL });
  client.on("error", (err) => logger.error("redis:sub:error", err.message));
  await client.connect();
  logger.info("redis:sub:connected", env.REDIS_URL);
  return client;
};

export default createMainClient;
