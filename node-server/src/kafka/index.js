import admin from "./kafka.admin.js";
import producer from "./kafka.producer.js";
import { disconnectAllConsumers, startAllConsumers } from "./kafka.consumer.js";

export const initKafka = async (opts = {}) => {
  // Connect producer and ensure topics exist. Do not expose raw producer/consumer.
  try {
    await producer.connectProducer();
  } catch (err) {
    console.error("Failed to connect Kafka producer:", err.message || err);
    throw err;
  }

  try {
    await admin.createTopicsIfNotExist(opts.topicOptions || {});
  } catch (err) {
    console.warn(
      "Failed to create or verify Kafka topics:",
      err.message || err
    );
  }

  try {
    await startAllConsumers();
  } catch (err) {
    console.warn("Failed to start Kafka consumers:", err.message || err);
  }
};

export const publishEvent = async (topic, event) => {
  return producer.publishEvent(topic, event);
};

export const sendMessage = async (topic, event) => {
  return publishEvent(topic, event);
};

export const shutdownKafka = async () => {
  await disconnectAllConsumers();
  await producer.disconnectProducer();
  await admin.disconnectAdmin();
};

export default {
  initKafka,
  publishEvent,
  sendMessage,
  shutdownKafka,
};
