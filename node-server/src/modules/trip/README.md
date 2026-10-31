# Trip module

Booking trips (request → candidates accept → trip) and company route runs (driver taps Start on a reusable route template).

## Data model

| Model | Collection | Role |
| --- | --- | --- |
| `TripRequests` | triprequests | Offer. `recipients[]` are candidates who may accept. `vehiclesRequired` / `acceptedCount` cap acceptance. |
| `Trip` | trips | Confirmed assignments. `recipients[]` are assigned drivers/vehicles (`_id` = recipientId). Company runs also set `companyRouteId`, `runId`. |
| `TripStops` | tripstops | Route stops plus per-assignment progress in `stops[].recipientsMeta[]`. |
| `CompanyTripRoutes` | company routes | Reusable template: stops plus standing driver/vehicle assignments. |

Guarantees (enforced by unique partial indexes and atomic conditional updates):

- One Trip per request (`tripRequestId`).
- One run per `(companyRouteId, runId)` (safe client retries).
- One open trip per driver (`activeDriverUserId`) and per vehicle (`activeVehicleId`).
- Accepting beyond `vehiclesRequired` is rejected; once full, remaining pending candidates become `EXPIRED`.

## Folder layout

```
constants/     status groups, limits, redis keys, queue names, log and response messages
models/        mongoose schemas and indexes only
repositories/  database access only, no business rules
pipelines/     aggregation pipelines and pipeline-style updates
services/      orchestration: validate, call repositories, publish events
controller/    HTTP layer: call one service, shape the response
events/        event payload builders, kafka publisher, handler
queues/        bullmq queue, jobs, worker
utils/         every helper (see below)
scripts/       migrate-trip-refactor.js (dry run by default, --apply to write)
test/          node:test suites
```

Rule: services, controllers, repositories and pipelines contain no local helper functions. Anything reusable lives in `utils/`; any fixed value lives in `constants/`.

## Flows

### Booking
1. `POST /requests` creates a TripRequest with candidates and `vehiclesRequired`.
2. `POST /requests/:id/accept-driver` atomically claims one acceptance slot, upserts the Trip by `tripRequestId`, links stops, publishes `TRIP_ACCEPTED`. Retrying after a crash heals missing pieces.
3. When `acceptedCount` reaches `vehiclesRequired` the request is fulfilled (`TRIP_FULFILLED`) and other pending candidates expire.
4. `POST /requests/:id/accept-owner` (assign drivers) and `reject-driver` follow the same atomic pattern.
5. Stop progress is tracked per assignment, so several vehicles on one request never overwrite each other.

### Company run
1. `GET /company/driver/routes` lists routes where the driver has a standing assignment.
2. `POST /company/routes/:routeId/runs` (driver, vehicle, optional `runId`) creates the run Trip and a stop snapshot, then publishes `TRIP_STARTED`. Replays with the same `runId` return the same trip.
3. `POST /company/trips/:tripId/stop-progress` updates progress; the response carries `canEnd`.
4. `POST /company/trips/:tripId/end` is done by the active driver. Ending before the last stop requires a `reason`.
5. `POST /company/trips/:tripId/handover` (active driver or owner) moves the run to another driver and clears the old driver's location keys.
6. `POST /company/trips/:tripId/stops` (owner) appends extra stops mid-run.

Company runs never create TripRequests.

## Endpoints

| Method | Path | Handler |
| --- | --- | --- |
| POST | `/requests`, `/requests/:requestType` | createTripRequest |
| GET | `/requests`, `/requests/:tripId` | listTripRequests, getTripRequestDetails |
| POST | `/requests/:tripId/accept-owner` | acceptTripRequestForOwner |
| POST | `/requests/:tripId/accept-driver` | acceptTripRequestForDriver |
| POST | `/requests/:tripId/reject-driver` | rejectTripRequestForDriver |
| GET | `/driver/current` | getDriverCurrentTripDetails |
| POST/GET | `/company/routes` | createCompanyTrip, listCompanyRoutes |
| GET | `/company/active`, `/company/:tripId` | listCompanyActiveTrips, getCompanyTripDetails |
| GET | `/company/driver/routes` | listDriverCompanyRoutes |
| POST | `/company/routes/:routeId/runs` | startCompanyRun |
| POST | `/company/trips/:tripId/{end,handover,stops,stop-progress}` | endCompanyRun, handoverCompanyRun, addCompanyRunStops, updateCompanyRunStopProgress |

## Events (Kafka topic from `TOPIC_TRIP`)

`TRIP_CREATED`, `TRIP_UPDATED`, `TRIP_ACCEPTED`, `TRIP_ASSIGNED`, `TRIP_REJECTED`, `TRIP_FULFILLED`, `TRIP_STOP_UPDATED`, `TRIP_STARTED`, `TRIP_HANDOVER`, `TRIP_STOPS_ADDED`, `TRIP_ENDED`.
Envelope: `{ event, data, timestamp }`. Publishing failures are logged and never fail the request.

## Constants

- `trip.constants.js`: status groups (`REQUEST_STATUSES`, `CANDIDATE_STATUSES`, `ASSIGNMENT_STATUSES`, `TRIP_LIFECYCLE_STATUSES`, `TERMINAL_STOP_STATUSES`, `REQUEST_OPEN_STATUSES`), defaults, `COMPANY_RUN` limits, `BSON_TYPE`, `TRIP_FIELDS`, `TRIP_QUEUE`, `HTTP_STATUS`, `LOG_MESSAGES`, `TRIP_EVENT_TYPES`.
- `trip.messages.js`, `company.messages.js`: `*_ERRORS`, `*_RESPONSES`, `*_FAILURES`.
- `trip.redis.keys.js`, `trip.socket.events.js`.

## Utils reference

| File | Exports |
| --- | --- |
| `objectId.js` | `isObjectIdLike`, `toObjectId`, `toOptionalObjectId`, `newObjectId` |
| `requireIds.js` | `requireUserId`, `requireTripId` |
| `handleRequest.js` | `handleRequest`, `handleAction`, `withData` (controller wrappers) |
| `mongoErrors.js` | `isDuplicateKeyError`, `duplicateKeyFields` |
| `normalizeRecipients.js`, `parseVehiclesRequired.js`, `parseStopProgress.js` | request input parsing for bookings |
| `formatRecipients.js`, `formatTripStop.js`, `buildTripAssignment.js`, `findRecipient.js` | booking shaping and lookup |
| `claimCandidate.js` | atomic candidate claim with idempotent replay |
| `companyRoute.js` | assignment predicates: `sameId`, `findStandingAssignment`, `findActiveAssignment`, `isTripOwner`, `hasAssignment`, `hasHandedOver`, `wasHandedOverTo`, `isRunTrip` |
| `companyRun.parsers.js` | `parseStartRun`, `parseEndRun`, `parseHandover`, `parseExtraStops` |
| `companyRun.builders.js` | run, assignment, stop and summary builders; `buildStartResult`, `hasFinishedAllStops`, `nextStopSequence` |
| `companyRun.helpers.js` | `findOpenRunTrip`, `findReplayedRun`, `healRunStops`, `recoverStartConflict` |
| `companyRun.errors.js` | `isActiveRunConflict`, `toRunConflictError` |
| `pipelineExpressions.js` | `mapRecipientsWhere`, `mapAssignment`, `isPendingFor` |
| `locationKeys.js`, `clearLocation.js` | redis key builders and best-effort clearing |

## Migration

`node scripts/migrate-trip-refactor.js` reports duplicates, accepted requests without a trip, invalid statuses and string ids. Add `--apply` to backfill `vehiclesRequired`/`acceptedCount` and create the unique index. It is idempotent and non-destructive. There is no migration for company routes yet.

## Tests

`test/run.sh test/*.test.js` copies the module into a harness and runs `node --test`. Integration suites need a real MongoDB replica set (`MONGO_URI`, or mongodb-memory-server with `MONGOMS_SYSTEM_BINARY`). Express routes and auth are not covered by tests.
