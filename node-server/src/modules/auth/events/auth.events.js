export const TOPIC_USER_REGISTERED = "auth.user.registered";

export const buildUserRegistered = (user) => ({
  event: "USER_REGISTERED",
  data: user,
  timestamp: new Date().toISOString(),
});
