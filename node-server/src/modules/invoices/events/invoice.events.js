export const TOPIC_INVOICE_CREATED = "invoices.created";

export const buildInvoiceCreated = (invoice) => ({
  event: "INVOICE_CREATED",
  data: invoice,
  timestamp: new Date().toISOString(),
});

export const handleInvoiceEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Invoice Kafka event received:", parsed);
  return parsed;
};

export default {
  handleInvoiceEvent,
  buildInvoiceCreated,
};
