const env = process.env;

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return parsed > 0 ? parsed : fallback;
};

const normalizeBrokers = (raw) =>
  raw
    .split(",")
    .map((broker) =>
      broker
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "")
    )
    .filter((broker) => broker.includes(":"));

const DEFAULT_TOPICS = {
  TRIP: "trip-events",
  DRIVER: "driver-events",
  COMPANY: "company-events",
  PAYMENT: "payment-events",
  FLEET: "fleet-events",
  VEHICLE: "vehicle-events",
  NOTIFICATION: "notifications-events",
  INVOICE: "invoices-events",
  PROOF: "proofs-events",
};

export const KAFKA_ENABLED = String(env.KAFKA_ENABLED).toLowerCase() === "true";

export const CLIENT_ID = env.KAFKA_CLIENT_ID || "rynzo-api";

export const BROKERS = normalizeBrokers(env.KAFKA_BROKERS || "localhost:9092");

export const SSL = String(env.KAFKA_SSL).toLowerCase() === "true";

export const SASL = env.KAFKA_SASL_USERNAME
  ? {
      mechanism: (env.KAFKA_SASL_MECHANISM || "plain").toLowerCase(),
      username: env.KAFKA_SASL_USERNAME,
      password: env.KAFKA_SASL_PASSWORD,
    }
  : undefined;

export const PARTITIONS = toInt(env.KAFKA_PARTITIONS, 3);

export const REPLICATION_FACTOR = toInt(env.KAFKA_REPLICATION_FACTOR, 3);

export const TOPICS = Object.fromEntries(
  Object.entries(DEFAULT_TOPICS).map(([name, topic]) => [
    name,
    env[`KAFKA_TOPIC_${name}`] || topic,
  ])
);

export const CONSUMER_GROUPS = Object.fromEntries(
  Object.keys(DEFAULT_TOPICS).map((name) => [
    name,
    `${name.toLowerCase()}-consumer-group`,
  ])
);
