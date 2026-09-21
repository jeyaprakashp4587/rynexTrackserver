import { publishEvent } from "../../../kafka/index.js";
import { TOPICS } from "../../../kafka/kafka.config.js";
import { buildDriverUpdated } from "./driver.events.js";

export const publishDriverUpdated = async (driver) => {
  return publishEvent(TOPICS.DRIVER, buildDriverUpdated(driver));
};

export default {
  publishDriverUpdated,
};
