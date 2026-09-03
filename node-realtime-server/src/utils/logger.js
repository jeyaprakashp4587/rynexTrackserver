const SERVICE = "logistics-realtime";

function format(level, event, message, meta) {
  const payload = {
    timestamp: new Date().toISOString(),
    service: SERVICE,
    level,
    event,
    message,
  };
  if (meta) payload.meta = meta;
  return JSON.stringify(payload);
}

export const logger = {
  info: (event, message, meta) =>
    console.log(format("info", event, message, meta)),
  warn: (event, message, meta) =>
    console.warn(format("warn", event, message, meta)),
  error: (event, message, meta) =>
    console.error(format("error", event, message, meta)),
};

export default logger;
