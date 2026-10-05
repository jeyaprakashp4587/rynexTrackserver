import { requireKafka } from "./kafka.client.js";
import { PARTITIONS, REPLICATION_FACTOR, TOPICS } from "./kafka.config.js";
import logger from "./kafka.logger.js";

const resolveTopics = (overrides) =>
  Object.entries(TOPICS).map(([domain, topic]) => ({
    topic,
    numPartitions:
      overrides.partitions?.[domain.toLowerCase()] ?? PARTITIONS[domain],
  }));

export const createTopicsIfNotExist = async (overrides = {}) => {
  const admin = requireKafka().admin();
  await admin.connect();

  try {
    const [existing, cluster] = await Promise.all([
      admin.listTopics(),
      admin.describeCluster(),
    ]);

    const requested = overrides.replicationFactor ?? REPLICATION_FACTOR;
    const replicationFactor = Math.min(requested, cluster.brokers.length);

    if (replicationFactor < requested) {
      logger.warn(
        `Replication factor lowered from ${requested} to ${replicationFactor} (brokers available: ${cluster.brokers.length})`
      );
    }

    const topics = resolveTopics(overrides);
    const missing = topics
      .filter(({ topic }) => !existing.includes(topic))
      .map((topic) => ({ ...topic, replicationFactor }));
    const skipped = topics
      .filter(({ topic }) => existing.includes(topic))
      .map(({ topic }) => topic);

    if (missing.length === 0) {
      return { created: [], skipped };
    }

    try {
      await admin.createTopics({ topics: missing, waitForLeaders: true });
    } catch (error) {
      if (error?.type !== "TOPIC_ALREADY_EXISTS") throw error;
      logger.warn("Some topics were created concurrently by another instance");
    }

    return { created: missing.map(({ topic }) => topic), skipped };
  } finally {
    await admin.disconnect().catch(() => {});
  }
};

export default {
  createTopicsIfNotExist,
};
