import { createMainClient } from "../../clients/main.client.js";
import env from "../../../config/env.js";
import { logger } from "../../../utils/logger.js";

const TTL = env.HEARTBEAT_TTL || 30;

export const touchHeartbeat = async (driverId) => {
  const client = await createMainClient();
  const key = `driver:heartbeat:${driverId}`;
  await client.set(key, "1", { EX: TTL });
  logger.info("heartbeat:touch", `touched ${key}`);
};

export const isDriverOnline = async (driverId) => {
  const client = await createMainClient();
  const key = `driver:heartbeat:${driverId}`;
  const val = await client.exists(key);
  return val === 1;
};

export default { touchHeartbeat, isDriverOnline };
