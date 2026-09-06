import * as invoiceService from "../services/invoice.service.js";

export const createInvoice = async (req, res) => {
  try {
    const result = await invoiceService.createInvoice(req.body);
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
