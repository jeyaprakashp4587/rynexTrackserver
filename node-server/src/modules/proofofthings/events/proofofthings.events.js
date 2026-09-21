export const TOPIC_PROOF_SUBMITTED = "proofs.submitted";

export const buildProofSubmitted = (payload) => ({
  event: "PROOF_SUBMITTED",
  data: payload,
  timestamp: new Date().toISOString(),
});

export const handleProofEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Proof Kafka event received:", parsed);
  return parsed;
};

export default {
  handleProofEvent,
  buildProofSubmitted,
};
