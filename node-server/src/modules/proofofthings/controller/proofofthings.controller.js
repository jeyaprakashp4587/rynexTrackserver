import * as proofService from "../services/proofofthings.service.js";

export const submitProof = async (req, res) => {
  try {
    const result = await proofService.submitProof(req.body);
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
