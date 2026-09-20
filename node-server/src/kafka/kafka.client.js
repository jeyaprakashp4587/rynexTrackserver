import { Kafka } from "kafkajs";

const clientId = process.env.KAFKA_CLIENT_ID || "rynzo-api";
const brokers = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

const kafka = new Kafka({ clientId, brokers });

export default kafka;
