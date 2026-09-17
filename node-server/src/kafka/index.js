import { Kafka } from "kafkajs";

let kafkaClient = null;
let producer = null;
let consumer = null;

export const initKafka = async ({ brokers, clientId, consumerGroup } = {}) => {
  const configuredBrokers = brokers || process.env.KAFKA_BROKERS;

  if (!configuredBrokers || !String(configuredBrokers).trim()) {
    console.warn(
      "Kafka is disabled: KAFKA_BROKERS is not set. Set it to enable Kafka messaging."
    );
    producer = null;
    consumer = null;
    kafkaClient = null;
    return { producer, consumer };
  }

  const brokersList = Array.isArray(configuredBrokers)
    ? configuredBrokers
    : String(configuredBrokers)
        .split(",")
        .map((broker) => broker.trim())
        .filter(Boolean);

  if (!brokersList.length) {
    throw new Error("Kafka broker list is empty. Check KAFKA_BROKERS.");
  }

  const id = clientId || process.env.KAFKA_CLIENT_ID || "rynex-track";
  const groupId =
    consumerGroup || process.env.KAFKA_CONSUMER_GROUP || "rynex-group";

  kafkaClient = new Kafka({ clientId: id, brokers: brokersList });
  producer = kafkaClient.producer();
  consumer = kafkaClient.consumer({ groupId });

  try {
    await producer.connect();
  } catch (e) {
    console.error("Kafka producer connect failed:", e.message || e);
    throw e;
  }

  try {
    await consumer.connect();
  } catch (e) {
    // consumer optional at startup
    console.warn("Kafka consumer connect warning:", e.message || e);
  }

  return { producer, consumer };
};

export const getProducer = () => producer;
export const getConsumer = () => consumer;

export const sendMessage = async (topic, message) => {
  if (!producer) {
    throw new Error(
      "Kafka producer not initialized. Set KAFKA_BROKERS to enable Kafka messaging."
    );
  }

  const payload =
    typeof message === "string" ? message : JSON.stringify(message);
  return producer.send({ topic, messages: [{ value: payload }] });
};

export default {
  initKafka,
  getProducer,
  getConsumer,
  sendMessage,
};
