export const TOPIC_PROOF_SUBMITTED = "proofs.submitted";

export const buildProofSubmitted = (payload) => ({
  event: "PROOF_SUBMITTED",
  data: payload,
  timestamp: new Date().toISOString(),
});
