import kafka from "./kafka.client.js";
import { KAFKA_ENABLED } from "./kafka.config.js";

const KEY_FIELDS = [
  "tripId",
  "paymentId",
  "driverId",
  "fleetId",
  "customerId",
  "id",
];

let producerPromise = null;

export const connectProducer = () => {
  if (!producerPromise) {
    const producer = kafka.producer({
      idempotent: true,
      maxInFlightRequests: 1,
    });

    producerPromise = producer
      .connect()
      .then(() => producer)
      .catch((error) => {
        producerPromise = null;
        throw error;
      });
  }

  return producerPromise;
};

export const disconnectProducer = async () => {
  if (!producerPromise) return;

  const producer = await producerPromise;
  producerPromise = null;
  await producer.disconnect();
};

const getKey = (event) => {
  const data = event?.data;
  const field = data && KEY_FIELDS.find((name) => data[name] != null);
  return field ? String(data[field]) : undefined;
};

export const publishEvent = async (topic, event) => {
  if (!KAFKA_ENABLED) return null;

  const producer = await connectProducer();

  return producer.send({
    topic,
    acks: -1,
    messages: [
      {
        key: getKey(event),
        value: typeof event === "string" ? event : JSON.stringify(event),
      },
    ],
  });
};
