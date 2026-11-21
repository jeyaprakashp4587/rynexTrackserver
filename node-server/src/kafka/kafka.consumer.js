import kafka from "./kafka.client.js";
import { CONSUMER_GROUPS, TOPICS } from "./kafka.config.js";
import tripEvents from "../modules/trip/events/trip.events.js";
import driverEvents from "../modules/driver/events/driver.events.js";
import vehicleEvents from "../modules/vehicle/events/vehicle.events.js";
import companyEvents from "../modules/company/events/company.events.js";

const getSubscriptions = () => [
  {
    topic: TOPICS.TRIP,
    groupId: CONSUMER_GROUPS.TRIP,
    handler: tripEvents.handleTripEvent,
  },
  {
    topic: TOPICS.TRIP,
    groupId: CONSUMER_GROUPS.DRIVER_TRIP,
    handler: driverEvents.handleDriverEvent,
  },
  {
    topic: TOPICS.TRIP,
    groupId: CONSUMER_GROUPS.VEHICLE_TRIP,
    handler: vehicleEvents.handleVehicleEvent,
  },
  {
    topic: TOPICS.DRIVER,
    groupId: CONSUMER_GROUPS.DRIVER,
    handler: driverEvents.handleDriverEvent,
  },
  {
    topic: TOPICS.VEHICLE,
    groupId: CONSUMER_GROUPS.VEHICLE,
    handler: vehicleEvents.handleVehicleEvent,
  },
  {
    topic: TOPICS.COMPANY,
    groupId: CONSUMER_GROUPS.COMPANY,
    handler: companyEvents.handleCompanyEvent,
  },
];

let consumers = [];

const validateSubscriptions = (subscriptions) => {
  const groupTopicMap = new Map();
  for (const { topic, groupId } of subscriptions) {
    if (!groupId) {
      throw new Error(
        `Consumer subscription for topic "${topic}" is missing groupId`
      );
    }
    if (!groupTopicMap.has(groupId)) {
      groupTopicMap.set(groupId, topic);
    } else if (groupTopicMap.get(groupId) !== topic) {
      throw new Error(
        `Kafka consumer group "${groupId}" is subscribed to multiple topics ("${groupTopicMap.get(
          groupId
        )}" and "${topic}"). In Kafka, consumers with different topic subscriptions must use separate consumer group IDs.`
      );
    }
  }
};

const startConsumer = async ({ topic, groupId, handler }) => {
  if (!kafka) {
    throw new Error("Kafka client is not initialized");
  }

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
            key: message.key ? message.key.toString("utf8") : undefined,
            value: message.value ? message.value.toString("utf8") : undefined,
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
  if (!kafka) return;

  const subscriptions = getSubscriptions();
  validateSubscriptions(subscriptions);

  const results = await Promise.allSettled(
    subscriptions.map((subscription) => startConsumer(subscription))
  );

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      consumers.push(result.value);
      return;
    }

    console.warn(
      `Failed to start Kafka consumer for ${subscriptions[index].topic} (${subscriptions[index].groupId}):`,
      result.reason?.message || result.reason
    );
  });
};
// update
export const stopAllConsumers = async () => {
  await Promise.allSettled(consumers.map((consumer) => consumer.disconnect()));
  consumers = [];
};
