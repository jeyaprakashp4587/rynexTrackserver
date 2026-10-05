# Kafka Module

Event layer for `rynzo-api`, built on `kafkajs`. One producer, one consumer per subscription, topics auto-provisioned on startup.

## Structure

| File                     | Responsibility                                                          |
| ------------------------ | ----------------------------------------------------------------------- |
| `index.js`               | Public API: `initKafka`, `publishEvent`, `sendMessage`, `shutdownKafka` |
| `kafka.config.js`        | All env parsing, topic names, partitions, consumer groups               |
| `kafka.client.js`        | Single `Kafka` instance (SSL / SASL / retry / timeouts)                 |
| `kafka.admin.js`         | Creates missing topics, then disconnects                                |
| `kafka.producer.js`      | Idempotent producer, key derivation, `publishEvent`                     |
| `kafka.consumer.js`      | Starts / stops consumers, JSON parsing, handler retries                 |
| `kafka.subscriptions.js` | Registry of `topic → consumer group → handler`                          |
| `kafka.logger.js`        | Prefixed logger (`[kafka]`)                                             |

Import only from `index.js` outside this folder.

## Usage

Startup and shutdown:

```js
import { initKafka, shutdownKafka } from "./kafka/index.js";

await initKafka();

process.on("SIGTERM", async () => {
  await shutdownKafka();
  process.exit(0);
});
```

Publishing:

```js
import { publishEvent } from "./kafka/index.js";
import { TOPICS } from "./kafka/kafka.config.js";

await publishEvent(TOPICS.TRIP, {
  type: "TRIP_CREATED",
  data: { tripId: "t_123" },
});
```

The message key is taken from the first present field of `event.data`: `tripId`, `paymentId`, `driverId`, `fleetId`, `customerId`, `id`. Same key means same partition, so events for one trip stay ordered.

## Consuming

Handlers receive one payload object:

```js
{
  topic,
    partition,
    offset,
    key,
    timestamp,
    value, // raw Buffer
    event; // parsed JSON, or null if the message was not valid JSON
}
```

Failed handlers are retried with exponential backoff (`KAFKA_HANDLER_MAX_ATTEMPTS`, `KAFKA_HANDLER_RETRY_DELAY_MS`). After the last attempt the message is logged as an error and skipped, so one bad message never blocks the partition.

### Add a new consumer

Add one entry in `kafka.subscriptions.js`:

```js
{
  topic: TOPICS.PAYMENT,
  groupId: CONSUMER_GROUPS.PAYMENT,
  handler: paymentEvents.handlePaymentEvent,
}
```

### Add a new topic

Add one line in `DEFAULT_TOPICS` in `kafka.config.js`, for example `SHIPMENT: "shipment-events"`. Topic name, partitions, consumer group and provisioning all derive from it automatically.

## Environment variables

| Variable                                      | Default                   | Notes                                                                                          |
| --------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| `KAFKA_ENABLED`                               | `false`                   | `true`, `1`, `yes`, `on` enable it                                                             |
| `KAFKA_BROKERS`                               | `localhost:9092`          | Comma separated, protocol prefix stripped                                                      |
| `KAFKA_CLIENT_ID`                             | `rynzo-api`               |                                                                                                |
| `KAFKA_SSL`                                   | `false`                   |                                                                                                |
| `KAFKA_SASL_MECHANISM`                        | none                      | `plain`, `scram-sha-256`, `scram-sha-512`                                                      |
| `KAFKA_SASL_USERNAME` / `KAFKA_SASL_PASSWORD` | none                      | Required with SASL                                                                             |
| `KAFKA_REPLICATION_FACTOR`                    | `3`                       | Lowered automatically to broker count with a warning                                           |
| `KAFKA_LOG_LEVEL`                             | `warn`                    | `nothing`, `error`, `warn`, `info`, `debug`                                                    |
| `KAFKA_CONNECTION_TIMEOUT_MS`                 | `10000`                   |                                                                                                |
| `KAFKA_REQUEST_TIMEOUT_MS`                    | `30000`                   |                                                                                                |
| `KAFKA_RETRIES`                               | `8`                       | Client level retries                                                                           |
| `KAFKA_HANDLER_MAX_ATTEMPTS`                  | `3`                       | Per message                                                                                    |
| `KAFKA_HANDLER_RETRY_DELAY_MS`                | `500`                     | Doubles each attempt                                                                           |
| `KAFKA_TOPIC_<DOMAIN>`                        | see config                | `TRIP`, `DRIVER`, `COMPANY`, `PAYMENT`, `FLEET`, `VEHICLE`, `NOTIFICATION`, `INVOICE`, `PROOF` |
| `KAFKA_PARTITIONS_<DOMAIN>`                   | `3`                       |                                                                                                |
| `KAFKA_CONSUMER_GROUP_<DOMAIN>`               | `<domain>-consumer-group` |                                                                                                |

All previous variable names and default topic names are unchanged.

## Behavior changes from the old version

- `COMPANY` topic now uses `KAFKA_PARTITIONS_COMPANY` (it previously read the `DRIVER` partition setting).
- `KAFKA_ENABLED` only accepts `true`, `1`, `yes`, `on`. Before, any value other than `false` (including an empty string) enabled it.
- `publishEvent` returns `null` when Kafka is disabled instead of throwing. It also connects the producer lazily if needed.
- Producer is idempotent (`acks: -1`, one in-flight request) so retries never duplicate messages.
- Replication factor above the broker count no longer fails topic creation on local single-broker setups.
- Admin client connects only during topic provisioning. `getAdmin` and `disconnectAdmin` were removed.
- `createTopicsIfNotExist` returns topic names in `created` and `skipped`.
- Handlers get the extra `event` (parsed), `key` and `timestamp` fields. `value` is still the raw buffer.
- A handler that keeps failing is skipped after retries. If you need zero loss, route failed payloads to a `<topic>.dlq` topic inside `runHandler` in `kafka.consumer.js`.
- Consumers log crashes, and a failed start disconnects the half-created consumer.
