import kafka from "./kafka.client.js";

let producer = null;

export const connectProducer = async () => {
  if (!kafka) throw new Error("Kafka client not configured");
  if (producer) return producer;
  producer = kafka.producer();
  await producer.connect();
  return producer;
};

export const disconnectProducer = async () => {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
};

const deriveKey = (event) => {
  if (!event || !event.data) return undefined;
  const d = event.data;
  return (
    d.tripId || d.paymentId || d.driverId || d.fleetId || d.customerId || d.id
  );
};

export const publishEvent = async (topic, event) => {
  if (!producer)
    throw new Error("Kafka producer not connected. Call connectProducer().");

  const key = deriveKey(event);
  const value = typeof event === "string" ? event : JSON.stringify(event);

  const message = { value };
  if (key) message.key = String(key);

  return producer.send({ topic, messages: [message] });
};

export default {
  connectProducer,
  disconnectProducer,
  publishEvent,
};
