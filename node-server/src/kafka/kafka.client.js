import { Kafka } from "kafkajs";
import {
  BROKERS,
  CLIENT_ID,
  KAFKA_ENABLED,
  PARTITIONS,
  REPLICATION_FACTOR,
  SASL,
  SSL,
  TOPICS,
} from "./kafka.config.js";

const kafka = KAFKA_ENABLED
  ? new Kafka({ clientId: CLIENT_ID, brokers: BROKERS, ssl: SSL, sasl: SASL })
  : null;

export const ensureTopics = async () => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const [existing, cluster] = await Promise.all([
      admin.listTopics(),
      admin.describeCluster(),
    ]);

    const topics = Object.values(TOPICS)
      .filter((topic) => !existing.includes(topic))
      .map((topic) => ({
        topic,
        numPartitions: PARTITIONS,
        replicationFactor: Math.min(REPLICATION_FACTOR, cluster.brokers.length),
      }));

    if (topics.length) {
      await admin.createTopics({ topics, waitForLeaders: true });
    }

    return topics.map(({ topic }) => topic);
  } finally {
    await admin.disconnect();
  }
};

export default kafka;
