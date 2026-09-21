export const TOPIC_NOTIFICATION_CREATED = "notifications.created";

export const buildNotificationCreated = (payload) => ({
  event: "NOTIFICATION_CREATED",
  data: payload,
  timestamp: new Date().toISOString(),
});

export const handleNotificationEvent = async (payload) => {
  const parsed =
    typeof payload?.value === "string"
      ? JSON.parse(payload.value)
      : payload?.value || payload;

  console.log("Notification Kafka event received:", parsed);
  return parsed;
};

export default {
  handleNotificationEvent,
  buildNotificationCreated,
};
