export const TOPIC_COMPANY_UPDATED = "company.updated";

export const buildCompanyUpdated = (company) => ({
  event: "COMPANY_UPDATED",
  data: company,
  timestamp: new Date().toISOString(),
});
