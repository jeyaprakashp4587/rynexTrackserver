import kafka from "../../kafka/index.js";

export const sendNotification = async (payload) => {
  const topic = "notifications.created";
  await kafka.sendMessage(topic, {
    payload,
    createdAt: new Date().toISOString(),
  });
  return { topic, payload };
};
