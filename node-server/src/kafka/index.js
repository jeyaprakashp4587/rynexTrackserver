import { KAFKA_ENABLED } from "./kafka.config.js";
import { ensureTopics } from "./kafka.client.js";
import {
  connectProducer,
  disconnectProducer,
  publishEvent,
} from "./kafka.producer.js";
import { startAllConsumers, stopAllConsumers } from "./kafka.consumer.js";

export { publishEvent };

export const sendMessage = publishEvent;

export const initKafka = async () => {
  if (!KAFKA_ENABLED) {
    console.info("Kafka is disabled. Set KAFKA_ENABLED=true to enable it.");
    return { enabled: false };
  }

  await connectProducer();

  try {
    await ensureTopics();
  } catch (error) {
    console.warn(
      "Failed to create or verify Kafka topics:",
      error.message || error
    );
  }

  await startAllConsumers();

  return { enabled: true };
};

export const shutdownKafka = async () => {
  await stopAllConsumers();
  await disconnectProducer();
};

export default {
  initKafka,
  publishEvent,
  sendMessage,
  shutdownKafka,
};
