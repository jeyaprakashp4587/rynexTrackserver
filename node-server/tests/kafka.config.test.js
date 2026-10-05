import test from "node:test";
import assert from "node:assert/strict";

import { normalizeKafkaBrokers } from "../src/kafka/kafka.config.js";

test("normalizeKafkaBrokers strips URL schemes and keeps host:port values", () => {
  assert.deepEqual(normalizeKafkaBrokers("localhost:9092"), ["localhost:9092"]);
  assert.deepEqual(normalizeKafkaBrokers("http://localhost:9092"), [
    "localhost:9092",
  ]);
  assert.deepEqual(
    normalizeKafkaBrokers("localhost:9092, http://broker-1:9092,broker-2:9092"),
    ["localhost:9092", "broker-1:9092", "broker-2:9092"]
  );
});

test("normalizeKafkaBrokers ignores empty values", () => {
  assert.deepEqual(normalizeKafkaBrokers(" , , "), []);
});
