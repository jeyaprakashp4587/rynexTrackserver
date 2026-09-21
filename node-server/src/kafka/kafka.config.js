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
  COMPANY: Number(process.env.KAFKA_PARTITIONS_COMPANY) || 3,
  PAYMENT: Number(process.env.KAFKA_PARTITIONS_PAYMENT) || 3,
  FLEET: Number(process.env.KAFKA_PARTITIONS_FLEET) || 3,
  VEHICLE: Number(process.env.KAFKA_PARTITIONS_VEHICLE) || 3,
  NOTIFICATION: Number(process.env.KAFKA_PARTITIONS_NOTIFICATION) || 3,
  INVOICE: Number(process.env.KAFKA_PARTITIONS_INVOICE) || 3,
  PROOF: Number(process.env.KAFKA_PARTITIONS_PROOF) || 3,
};
// upda
export const TOPICS = {
  TRIP: process.env.KAFKA_TOPIC_TRIP || "trip-events",
  DRIVER: process.env.KAFKA_TOPIC_DRIVER || "driver-events",
  COMPANY: process.env.KAFKA_TOPIC_COMPANY || "company-events",
  PAYMENT: process.env.KAFKA_TOPIC_PAYMENT || "payment-events",
  FLEET: process.env.KAFKA_TOPIC_FLEET || "fleet-events",
  VEHICLE: process.env.KAFKA_TOPIC_VEHICLE || "vehicle-events",
  NOTIFICATION: process.env.KAFKA_TOPIC_NOTIFICATION || "notifications-events",
  INVOICE: process.env.KAFKA_TOPIC_INVOICE || "invoices-events",
  PROOF: process.env.KAFKA_TOPIC_PROOF || "proofs-events",
};

export const CONSUMER_GROUPS = {
  TRIP: process.env.KAFKA_CONSUMER_GROUP_TRIP || "trip-consumer-group",
  DRIVER: process.env.KAFKA_CONSUMER_GROUP_DRIVER || "driver-consumer-group",
  COMPANY: process.env.KAFKA_CONSUMER_GROUP_COMPANY || "company-consumer-group",
  PAYMENT: process.env.KAFKA_CONSUMER_GROUP_PAYMENT || "payment-consumer-group",
  FLEET: process.env.KAFKA_CONSUMER_GROUP_FLEET || "fleet-consumer-group",
  VEHICLE: process.env.KAFKA_CONSUMER_GROUP_VEHICLE || "vehicle-consumer-group",
  NOTIFICATION:
    process.env.KAFKA_CONSUMER_GROUP_NOTIFICATION ||
    "notification-consumer-group",
  INVOICE: process.env.KAFKA_CONSUMER_GROUP_INVOICE || "invoice-consumer-group",
  PROOF: process.env.KAFKA_CONSUMER_GROUP_PROOF || "proof-consumer-group",
};
