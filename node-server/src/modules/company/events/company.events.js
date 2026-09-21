export const TOPIC_COMPANY_UPDATED = "company.updated";

export const buildCompanyUpdated = (company) => ({
  event: "COMPANY_UPDATED",
  data: company,
  timestamp: new Date().toISOString(),
});

export const handleCompanyEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Company Kafka event received:", parsed);
  return parsed;
};

export default {
  handleCompanyEvent,
  buildCompanyUpdated,
};
