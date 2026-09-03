import { logger } from "../../../utils/logger.js";

export const publish = async (pubClient, channel, message) => {
  try {
    const payload =
      typeof message === "string" ? message : JSON.stringify(message);
    await pubClient.publish(channel, payload);
  } catch (err) {
    logger.error("pubsub:publish", err.message);
  }
};

export default { publish };
