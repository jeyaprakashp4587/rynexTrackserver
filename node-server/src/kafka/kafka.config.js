export const CLIENT_ID = process.env.KAFKA_CLIENT_ID || "rynzo-api";
export const BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

export const REPLICATION_FACTOR =
  Number(process.env.KAFKA_REPLICATION_FACTOR) || 1;
// update
export const PARTITIONS = {
  TRIP: Number(process.env.KAFKA_PARTITIONS_TRIP) || 3,
  DRIVER: Number(process.env.KAFKA_PARTITIONS_DRIVER) || 3,
  PAYMENT: Number(process.env.KAFKA_PARTITIONS_PAYMENT) || 3,
  FLEET: Number(process.env.KAFKA_PARTITIONS_FLEET) || 3,
};
// upda
export const TOPICS = {
  TRIP: process.env.KAFKA_TOPIC_TRIP || "trip-events",
  DRIVER: process.env.KAFKA_TOPIC_DRIVER || "driver-events",
  PAYMENT: process.env.KAFKA_TOPIC_PAYMENT || "payment-events",
  FLEET: process.env.KAFKA_TOPIC_FLEET || "fleet-events",
};

export const CONSUMER_GROUPS = {
  TRIP: process.env.KAFKA_CONSUMER_GROUP_TRIP || "trip-consumer-group",
};
