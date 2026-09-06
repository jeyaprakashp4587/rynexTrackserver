export const TOPIC_NOTIFICATION_CREATED = "notifications.created";

export const buildNotificationCreated = (payload) => ({
  event: "NOTIFICATION_CREATED",
  data: payload,
  timestamp: new Date().toISOString(),
});
