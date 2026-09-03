# logistics-realtime

## Purpose

Realtime gateway for the logistics application. Handles Socket.io connections, driver location, presence, and routes business events from Redis to connected clients.

## Architecture

Express HTTP server for health checks and Socket.io for realtime.
Redis is used for GEO storage, heartbeats, and Pub/Sub. Multiple realtime instances use the Socket.io Redis adapter.

## Installation

1. Copy `.env.example` to `.env` and edit values.
2. Install deps: `npm install`
3. Start dev server: `npm run dev`

## Environment

See `.env.example` for variables. Important: `REDIS_URL` should point to your existing Redis instance.

## Socket events

Client -> Server:

- `trip:join`
- `trip:leave`
- `location:update`
- `driver:heartbeat`

Server -> Client:

- `location:updated`
- `driver:online`
- `driver:offline`
- `trip:created`, `trip:assigned`, `trip:accepted`, `trip:started`, `trip:cancelled`, `trip:completed`

## Redis keys

- `drivers:live:locations` (GEO)
- `driver:heartbeat:{driverId}` (TTL)

## Redis channels

- `events:trip`
- `events:driver`
- `events:booking`

## Scaling

Run multiple instances behind a load balancer. All instances share Redis and use the Socket.io Redis adapter.

## Security

- Use JWT auth for WebSocket handshake.
- Keep Redis bound to localhost/private network.

## ASCII Diagram

logistics-api (monolith)
↓ (publishes business events via Redis)
Redis
↓
logistics-realtime (Socket.io + Redis)
↓
Clients (mobile/web)
