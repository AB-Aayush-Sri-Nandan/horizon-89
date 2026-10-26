# Phase 1B reconstructed API

This is a controlled reconstruction, **not recovered historical source**.
No SPICE service, modeled ephemeris, terrain engine or AI provider is introduced.

From the repository root (Node >=24.5 <25):

```sh
npm ci
npm run dev:api
# In another terminal:
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The API binds only 127.0.0.1:3001 by default (`PORT` may override it). Vite proxies
`/api` to it. `H89_API_PROXY_TARGET` is a Vite-development-only override used by
browser tests for the separate fixture API on 3002. Production startup never
loads test fixture transports. The API process does not serve the frontend.
An actual deployment needs a reverse proxy and its own HTTPS/access policy.

`dev:api` and `test:live` enable Node's supported environment-proxy routing and
system CA trust. They preserve certificate verification and use injected proxy
settings without copying credentials. `.env`, if present, is loaded by Node and
ignored by Git. No provider credentials are required for Horizons or liveness.
Graceful SIGINT/SIGTERM shutdown allows 5 seconds before force-closing connections.

## Endpoints

- `GET /api/health`: process liveness; `upstreamChecked:false` explicitly makes no
  upstream-readiness claim. Does not call JPL.
- `GET /api/horizons?lat=-89&lon=0&alt=0&time=2026-10-10T06%3A00%3A00.123Z`:
  paired Sun/Earth lunar-observer geometry. `alt` defaults to 0 km. Latitude is
  −90…90°, signed east longitude −180…180°, altitude −20…100 km relative to the
  Horizons reference ellipsoid. Altitude bounds are application policy, not a
  claim about terrain clearance. Decimal-only finite inputs; reject duplicates,
  unknown parameters, blank strings and invalid/noncanonical UTC. Time requires
  `YYYY-MM-DDTHH:mm:ss.sssZ`; no silent rounding, timezone changes or calendar fixes.
- `POST /api/copilot`: JSON `{ "message": "..." }`, 1…2000 nonblank characters.
  Valid requests return HTTP 503 / UNAVAILABLE. Invalid requests return 400.
  Providers intentionally stay disabled even if someone configures a key.
  No prompt echo, logging, client-bundled keys or claims of a tested provider.

JSON errors contain top-level `status:UNAVAILABLE`, `requestId` and
`error:{code,message,retryable}`. They contain no measurements, stack traces,
server paths or upstream body dump. Exact bounded JPL diagnostic strings go only
to structured server logs. Never log prompts, environment dumps or credentials.

## Scientific request and response

Fixed host: `https://ssd.jpl.nasa.gov/api/horizons.api`. Outbound redirects are
rejected. The service sends two requests with:

```text
format=json
COMMAND='10' or '399'       (Sun / Earth centre)
OBJ_DATA='NO'
MAKE_EPHEM='YES'
EPHEM_TYPE='OBSERVER'
CENTER='coord@301'
COORD_TYPE='GEODETIC'
SITE_COORD='east-longitude,latitude,altitude-km'
TLIST='2026-10-10 06:00:00.123'
TLIST_TYPE='CAL'
TIME_TYPE='UT'
CAL_TYPE='GREGORIAN'
TIME_DIGITS='FRACSEC'
QUANTITIES='4'
APPARENT='AIRLESS'
CSV_FORMAT='YES'
EXTRA_PREC='YES'
```

Only upstream SITE_COORD longitude is normalized into [0,360). Returned site
longitude retains the user's signed value. No target-centre substitutions.

Verified documentation on 2026-10-26:
https://ssd-api.jpl.nasa.gov/doc/horizons.html
https://ssd.jpl.nasa.gov/horizons/manual.html

The parser validates target identity, Moon observer body, AIRLESS declaration,
single SOE/EOE block, one row, UTC epoch and header-labelled airless apparent
AZ/EL columns. It rejects n.a./NaN/out-of-range values, refracted columns and
unexpected structure. It does not infer valid science from an HTTP 200 alone.
It is fixture-tested; actual successful live observer output has not yet been
available to validate this parser against the service.

Quantity 4 gives **airless apparent topocentric** directions, not uncorrected
geometric vectors. Azimuth runs north→east in degrees. Elevation >0 is a
reference-horizontal-plane target-centre test. It does not calculate terrain
visibility, finite-disc extent, eclipses, solar power or an RF link budget.
`HORIZONS_LUNAR_TOPOCENTRIC` in metadata is a descriptive observer-coordinate
label, not a new NAIF frame identifier or verified MOON_ME transformation.
API signature version is recorded when supplied; no ephemeris model/kernel ID
is fabricated when missing from the parsed metadata.

Legacy `HorizonsGeometryResponse` fields remain. Optional top-level and per-target
provenance add observation epoch, original successful retrieval time, provider,
API version, observer convention, method, cache state and limitations. The client
adapter still accepts legacy payloads without inventing missing metadata.

## Reliability

- 10-second upstream deadline, including actual fetch response consumption;
  1,000,000-byte response cap (content-length and streamed byte count).
- Successful per-target results only, 120-second TTL, at most 256 cached entries.
  Key is target + latitude + normalized longitude + altitude + exact UTC.
- Identical in-flight queries share one retrieval per target. Shared fresh
  retrievals are LIVE. Actual completed cache hits are CACHED and retain original
  retrieval timestamps. A mixed hit/fresh pair is LIVE with per-target metadata.
- At most 16 different in-flight target requests; excess requests fail with 429.
  No automatic retries and no cached error masquerading as a valid result.
- A good target can remain cached when its companion target fails; no partial
  paired geometry is returned. Later success can reuse only that validated target.
- 60 requests/minute/IP, at most 1024 tracked IP buckets; no trusted forwarded-IP
  headers without explicit deployment configuration. Health bypasses this quota.
- JSON body limit 8 KiB, no fingerprint header, no-store, nosniff, restrictive
  API CSP and request IDs. Application-level rate limits/caches are single-process.

The frontend retains the last successful analysis snapshot. While a new request
is pending/failed, it does not display that snapshot's angles as current values;
it labels the retained snapshot's site and epoch. Altitude is editable and
included in query/result matching. The reviewed supplied LROC visual texture is
restored (see assets/README.md); the neutral reference-sphere fallback remains
in place if loading fails.

## Tests and live limitation

```sh
npm test
npm run test:backend
npm run test:science
npm run typecheck
npm run lint
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
npm run check:secrets
# Explicit opt-in; NOT part of PR CI:
H89_LIVE_SMOKE=1 npm run test:live
```

Observer-table fixtures are controlled text, not recorded NASA responses. Their
numbers come from user-supplied historical regression values; passing tests
proves software behavior, not scientific agreement with live JPL. Browser tests
use real Vite→Express HTTP with a test-only injected JPL transport on port 3002.
The production service on 3001 always uses the actual JPL host.

Live request on 2026-10-26 reached JPL but returned HTTP 200 error JSON:

```text
wldini(): missing required file LTKERNL; ;  ERROR in VLRDC: Var not declared: IP_ADDR
```

Through the running Vite proxy, health now returns 200, invalid inputs 400, and
this upstream failure returns a controlled API 502 / UNAVAILABLE. The old missing
local-backend connection failure is fixed; **502 remains an intentional status
for upstream failure**, not proof that live geometry works. No valid live angles
were received, and live scientific validation remains blocked.
