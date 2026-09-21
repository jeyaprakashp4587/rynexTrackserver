import kafka from "./kafka.client.js";
import { TOPICS, PARTITIONS, REPLICATION_FACTOR } from "./kafka.config.js";

let adminClient = null;

export const getAdmin = () => adminClient;

export const createTopicsIfNotExist = async (overrides = {}) => {
  if (!kafka) throw new Error("Kafka client not configured");

  adminClient = kafka.admin();
  await adminClient.connect();

  const existing = await adminClient.listTopics();

  const topicsToCreate = [];

  const pushIfMissing = (name, partitions, replicationFactor) => {
    if (!existing.includes(name)) {
      topicsToCreate.push({
        topic: name,
        numPartitions: partitions,
        replicationFactor,
      });
    }
  };

  const rf = overrides.replicationFactor ?? REPLICATION_FACTOR;

  pushIfMissing(TOPICS.TRIP, overrides.partitions?.trip ?? PARTITIONS.TRIP, rf);
  pushIfMissing(
    TOPICS.DRIVER,
    overrides.partitions?.driver ?? PARTITIONS.DRIVER,
    rf
  );
  pushIfMissing(
    TOPICS.COMPANY,
    overrides.partitions?.company ?? PARTITIONS.DRIVER,
    rf
  );
  pushIfMissing(
    TOPICS.PAYMENT,
    overrides.partitions?.payment ?? PARTITIONS.PAYMENT,
    rf
  );
  pushIfMissing(
    TOPICS.FLEET,
    overrides.partitions?.fleet ?? PARTITIONS.FLEET,
    rf
  );
  pushIfMissing(
    TOPICS.VEHICLE,
    overrides.partitions?.vehicle ?? PARTITIONS.VEHICLE,
    rf
  );
  pushIfMissing(
    TOPICS.NOTIFICATION,
    overrides.partitions?.notification ?? PARTITIONS.NOTIFICATION,
    rf
  );
  pushIfMissing(
    TOPICS.INVOICE,
    overrides.partitions?.invoice ?? PARTITIONS.INVOICE,
    rf
  );
  pushIfMissing(
    TOPICS.PROOF,
    overrides.partitions?.proof ?? PARTITIONS.PROOF,
    rf
  );

  if (topicsToCreate.length === 0) {
    return { created: [], skipped: Object.keys(TOPICS) };
  }

  try {
    const created = await adminClient.createTopics({
      topics: topicsToCreate,
      waitForLeaders: true,
    });
    return { created: topicsToCreate, result: created };
  } catch (err) {
    // If topics already exist concurrently, don't crash the app
    if (err && err.type === "TOPIC_ALREADY_EXISTS") {
      return { created: [], warning: "some topics already existed" };
    }
    throw err;
  }
};

export const disconnectAdmin = async () => {
  if (adminClient) {
    await adminClient.disconnect();
    adminClient = null;
  }
};

export default {
  getAdmin,
  createTopicsIfNotExist,
  disconnectAdmin,
};
