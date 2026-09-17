import kafka from "../../../kafka/index.js";

export const submitProof = async (payload) => {
  const topic = "proofs.submitted";
  await kafka.sendMessage(topic, {
    payload,
    createdAt: new Date().toISOString(),
  });
  return { topic, payload };
};
