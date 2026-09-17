import kafka from "../../../kafka/index.js";

export const createInvoice = async (payload) => {
  const topic = "invoices.created";
  await kafka.sendMessage(topic, {
    payload,
    createdAt: new Date().toISOString(),
  });
  return { topic, payload };
};
