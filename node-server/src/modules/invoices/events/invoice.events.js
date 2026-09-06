export const TOPIC_INVOICE_CREATED = "invoices.created";

export const buildInvoiceCreated = (invoice) => ({
  event: "INVOICE_CREATED",
  data: invoice,
  timestamp: new Date().toISOString(),
});
