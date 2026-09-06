import { Kafka } from "kafkajs";

let kafkaClient = null;
let producer = null;
let consumer = null;

export const initKafka = async ({ brokers, clientId, consumerGroup } = {}) => {
  const brokersList =
    brokers || (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
  const id = clientId || process.env.KAFKA_CLIENT_ID || "rynex-track";
  const groupId =
    consumerGroup || process.env.KAFKA_CONSUMER_GROUP || "rynex-group";

  kafkaClient = new Kafka({ clientId: id, brokers: brokersList });
  producer = kafkaClient.producer();
  consumer = kafkaClient.consumer({ groupId });

  await producer.connect();
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
  if (!producer) throw new Error("Kafka producer not initialized");
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
