# Trip module

Booking trips (request → candidates accept → trip) and company route runs (driver taps Start on a reusable route template).

## Two decoupled sub-domains

The module has two sub-domains that never import each other. Both share only `constants/shared`, `utils/shared`, `models/shared`, `events/` and `queues/`.

| Sub-domain | Models | Purpose |
| --- | --- | --- |
| generic | `TripRequests`, `Trip`, `TripStops` | Booking: request, candidates accept, trip. |
| company | `CompanyTripRoutes`, `CompanyRouteStops`, `CompanyRun`, `CompanyRunStops` | Reusable route templates and the daily runs drivers start from them. |

`Trip`, `TripRequests` and `TripStops` hold no company fields. A run is a `CompanyRun`, its stop snapshot is `CompanyRunStops`, and a route's template stops are `CompanyRouteStops`.

Guarantees (unique partial indexes plus atomic conditional updates):

- One Trip per request (`Trip.tripRequestId`).
- One run per `(companyRouteId, runId)` (safe client retries).
- One open run per driver (`activeDriverUserId`) and per vehicle (`activeVehicleId`).
- Accepting beyond `vehiclesRequired` is rejected; once full, remaining pending candidates become `EXPIRED`.

## Folder layout

Every layer folder has the same split: `generic/`, `company/`, and where needed `shared/`.

```
constants/     shared/ generic/ company/
models/        shared/ (assignment + stop schemas)  generic/  company/
repositories/  generic/  company/
pipelines/     generic/  company/
services/      generic/  company/
controller/    generic/  company/
routes/        generic.route.js  company.route.js   (trip.route.js mounts both)
utils/         shared/  generic/  company/
events/        trip.events.js company.events.js trip.publisher.js trip.handler.js
queues/        bullmq queue, jobs, worker
```

Rule: services, controllers, repositories and pipelines contain no local helper functions. Reusable logic lives in `utils/`; fixed values live in `constants/`.

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
| GET | `/company/driver/current` | getDriverCurrentCompanyRun (driver's open run with own stops, `null` when none) |
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

| Folder | Files |
| --- | --- |
| `utils/shared` | `objectId`, `requireIds`, `mongoErrors`, `handleRequest` (`handleRequest`, `handleAction`, `withData`), `pipelineExpressions`, `formatRecipients`, `formatTripStop`, `parseStopProgress`, `clearLocation`, `locationKeys` |
| `utils/generic` | `normalizeRecipients`, `parseVehiclesRequired`, `buildTripAssignment`, `findRecipient`, `claimCandidate` |
| `utils/company` | `companyRoute` (assignment predicates), `companyRun.parsers`, `companyRun.builders`, `companyRun.helpers`, `companyRun.errors` |

## Migrations

- `scripts/migrate-trip-refactor.js`: reports duplicates, accepted requests without a trip, invalid statuses and string ids. `--apply` backfills `vehiclesRequired`/`acceptedCount`.
- `scripts/migrate-company-split.js`: copies legacy company data into the new collections (route stop templates, runs, run stops, same `_id`s). Dry run by default, `--apply` to write, safe to run twice. It never deletes the legacy documents.

Both need `MONGO_URI`.

## Tests

`test/run.sh test/*.test.js` copies the module into a harness and runs `node --test`. Integration suites need a real MongoDB replica set (`MONGO_URI`, or mongodb-memory-server with `MONGOMS_SYSTEM_BINARY`). Express routes and auth are not covered by tests.
