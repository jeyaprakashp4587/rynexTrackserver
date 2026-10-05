import kafka from "./kafka.client.js";
import { CONSUMER_GROUPS, TOPICS } from "./kafka.config.js";
import tripEvents from "../modules/trip/events/trip.events.js";
import driverEvents from "../modules/driver/events/driver.events.js";

const getSubscriptions = () => [
  {
    topic: TOPICS.TRIP,
    groupId: CONSUMER_GROUPS.TRIP,
    handler: tripEvents.handleTripEvent,
  },
  {
    topic: TOPICS.DRIVER,
    groupId: CONSUMER_GROUPS.DRIVER,
    handler: driverEvents.handleDriverEvent,
  },
];

let consumers = [];

const startConsumer = async ({ topic, groupId, handler }) => {
  const consumer = kafka.consumer({ groupId });

  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ topic: messageTopic, partition, message }) => {
        try {
          await handler({
            topic: messageTopic,
            partition,
            offset: message.offset,
            key: message.key ? message.key.toString() : undefined,
            value: message.value,
          });
        } catch (error) {
          console.error(
            `Kafka handler failed (${messageTopic}[${partition}]@${message.offset}):`,
            error.message || error
          );
        }
      },
    });
  } catch (error) {
    await consumer.disconnect().catch(() => {});
    throw error;
  }

  return consumer;
};

export const startAllConsumers = async () => {
  const subscriptions = getSubscriptions();
  const results = await Promise.allSettled(
    subscriptions.map((subscription) => startConsumer(subscription))
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      consumers.push(result.value);
      return;
    }

    console.warn(
      `Failed to start Kafka consumer for ${subscriptions[index].topic}:`,
      result.reason?.message || result.reason
    );
  });
};
// update
export const stopAllConsumers = async () => {
  await Promise.allSettled(consumers.map((consumer) => consumer.disconnect()));
  consumers = [];
};
