import http from "http";
import createApp from "./app.js";
import env from "./config/env.js";
import { logger } from "./utils/logger.js";
import { initSocket } from "./socket/index.js";
import {
  createMainClient,
  createPubClient,
  createSubClient,
} from "./redis/clients/main.client.js";
import { startSubscriber } from "./redis/pubsub/subscriber.js";

const start = async () => {
  const app = createApp();
  const server = http.createServer(app);

  // Redis clients
  const mainRedis = await createMainClient();
  const pubClient = await createPubClient();
  const subClient = await createSubClient();

  // Socket.io
  const io = await initSocket(server, { pubClient, subClient });

  // Start pub/sub subscriber which will forward events to event router
  startSubscriber(subClient, io).catch((err) =>
    logger.error("subscriber:start", err.message)
  );

  server.listen(env.PORT, () => {
    logger.info("server:start", `listening on ${env.PORT}`);
    console.log(`listening on ${env.PORT}`);
  });

  const shutdown = async () => {
    logger.info("server:shutdown", "shutting down");
    server.close();
    await Promise.all([
      mainRedis.quit().catch(() => {}),
      pubClient.quit().catch(() => {}),
      subClient.quit().catch(() => {}),
    ]).catch(() => {});
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((err) => {
  logger.error("server:startup", err.message, { stack: err.stack });
  process.exit(1);
});
