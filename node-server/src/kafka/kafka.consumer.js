import kafka from "./kafka.client.js";
import { TOPICS, CONSUMER_GROUPS } from "./kafka.config.js";
import tripEvents from "../modules/trip/events/trip.events.js";
import driverEvents from "../modules/driver/events/driver.events.js";

const consumers = new Map();

const defaultHandler = async (message) => {
  try {
    const data =
      typeof message.value === "string"
        ? JSON.parse(message.value.toString())
        : message.value;

    console.log("Kafka message received:", {
      topic: message.topic,
      partition: message.partition,
      offset: message.offset,
      data,
    });
  } catch (error) {
    console.error("Failed to parse Kafka message:", error.message || error);
  }
};

export const startConsumer = async ({
  topic,
  groupId,
  handler = defaultHandler,
  fromBeginning = false,
  config = {},
}) => {
  if (!kafka) throw new Error("Kafka client not configured");

  const key = `${groupId}:${topic}`;
  if (consumers.has(key)) {
    return consumers.get(key);
  }

  const consumer = kafka.consumer({
    groupId,
    ...config,
  });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning });
  await consumer.run({
    eachMessage: async ({ topic: msgTopic, partition, message }) => {
      const payload = {
        topic: msgTopic,
        partition,
        offset: message.offset,
        key: message.key ? message.key.toString() : undefined,
        value: message.value,
      };
      await handler(payload);
    },
  });

  consumers.set(key, consumer);
  return consumer;
};

export const disconnectConsumer = async (key) => {
  const consumer = consumers.get(key);
  if (!consumer) return;
  await consumer.disconnect();
  consumers.delete(key);
};

export const disconnectAllConsumers = async () => {
  for (const key of [...consumers.keys()]) {
    await disconnectConsumer(key);
  }
};

export const startAllConsumers = async () => {
  const handlers = {
    [TOPICS.TRIP]: tripEvents.handleTripEvent,
    [TOPICS.DRIVER]: driverEvents.handleDriverEvent,
  };

  const consumerConfigs = [
    {
      topic: TOPICS.TRIP,
      groupId: CONSUMER_GROUPS.TRIP,
      handler: handlers[TOPICS.TRIP] || defaultHandler,
    },
    {
      topic: TOPICS.DRIVER,
      groupId: CONSUMER_GROUPS.DRIVER,
      handler: handlers[TOPICS.DRIVER] || defaultHandler,
    },
  ];

  const started = [];

  for (const consumerConfig of consumerConfigs) {
    try {
      const client = await startConsumer({
        ...consumerConfig,
        fromBeginning: false,
      });
      started.push(client);
    } catch (error) {
      console.warn(
        `Failed to start Kafka consumer for ${consumerConfig.topic}:`,
        error.message || error
      );
    }
  }

  return started;
};

export default {
  startConsumer,
  disconnectConsumer,
  disconnectAllConsumers,
  startAllConsumers,
};
