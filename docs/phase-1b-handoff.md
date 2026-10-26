# CHATGPT HANDOFF — HORIZON 89

## 1. Repository, branch and checkpoint

Repository `indscope/horizon-89`; branch `feat/horizon89-phase1b-backend`.
Before reconstruction, all pending Phase One files were reviewed, scanned,
committed as `6e18b94b530e7917eddfbb4e8a7f0cf25718c709`, pushed, and verified
with `git ls-remote`. Main and unrelated branches were not changed; no force push.
Final implementation is preserved on the same feature branch (completion chat
provides the exact implementation SHA). Nothing in this phase is presented as
recovered historical source.

## 2. Exact files added or modified in Phase 1B

- `.env.example`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/architecture.md`
- `docs/phase-1b-handoff.md`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `scripts/live-horizons-smoke.ts`
- `server/README.md`
- `server/app.ts`
- `server/errors.ts`
- `server/horizons.ts`
- `server/index.ts`
- `shared/science.ts`
- `shared/validation.ts`
- `src/App.tsx`
- `src/science/horizons.ts`
- `src/services/horizons.ts`
- `tests/backend/api.test.ts`
- `tests/backend/horizons.test.ts`
- `tests/browser/api-integration.spec.ts`
- `tests/browser/baseline.spec.ts`
- `tests/browser/fixtures.ts`
- `tests/fixtures/earth-observer.txt`
- `tests/fixtures/sun-observer.txt`
- `tests/horizons.test.ts`
- `tests/support/fixture-api.ts`
- `tsconfig.tests.json`
- `vite.config.ts`

The initial checkpoint separately preserved 30 Phase One files; its exact
inventory is in `git show --stat 6e18b94`. Kernels, local secrets, node_modules,
dist, browser reports and temporary downloaded documentation are not committed.

## 3. Reconstructed architecture

Express 5.3.0 public gateway (`server/app.ts`) with pure query/CSV/geometry service
(`server/horizons.ts`), structured ApiError (`server/errors.ts`), and loopback
listener/shutdown (`server/index.ts`). @types/express 5.0.6 is development-only.
No new AI provider, astronomy approximation, SPICE runtime, terrain engine or
visual redesign. Shared validation centralises latitude/longitude/altitude/UTC;
wire fields stay compatible, with optional top-level/per-target provenance.

Node >=24.5 <25 is required for the saved supported proxy invocation; validated
with Node 24.19.0/npm 11.9.0. `npm run dev:api` enables environment proxy routing
and system CA trust. Normal certificate verification stays enabled. No proxy
credential extraction or network bypass. Direct Node fetch initially failed
because it was not using the injected proxy; this was diagnosed and corrected.

## 4. Endpoints and frontend integration

- GET /api/health: 200 process liveness, `upstreamChecked:false`.
- GET /api/horizons: paired Sun/Earth observer geometry or structured UNAVAILABLE.
- POST /api/copilot: controlled 503 UNAVAILABLE for a valid bounded message;
  malformed input 400, oversized JSON 413. No provider expansion.

Actual production entry point starts on 127.0.0.1:3001; Vite on 5173 proxies /api
there. Restart and graceful SIGTERM exit were observed. Manual requests through
Vite returned health200, invalid-input400 and upstream-failure502 with JSON.
Browser tests additionally verify Vite→Express with only the JPL transport mocked.
The browser fixture API is isolated in tests/support on3002, Vite test port5174;
production code never imports or enables it.

The UI adds editable altitude, validates echoed site/epoch/altitude, preserves
retrieval times, formats angles to3 decimals, keeps the last successful snapshot,
and prevents its angles being shown as current during pending/failed requests.
The retained snapshot's site/time is labelled. Dashboard and Moon controls stay.

## 5. Horizons parameters and scientific conventions

Official API documentation and manual were retrieved over verified HTTPS on
2026-10-26. Sources and detailed contracts: `server/README.md`.

```text
https://ssd.jpl.nasa.gov/api/horizons.api
format=json
COMMAND='10' (Sun) / '399' (Earth centre)
OBJ_DATA='NO'; MAKE_EPHEM='YES'
EPHEM_TYPE='OBSERVER'; CENTER='coord@301'; COORD_TYPE='GEODETIC'
SITE_COORD='normalized-east-longitude,latitude,altitude-km'
TLIST='2026-10-10 06:00:00.123'; TLIST_TYPE='CAL'
TIME_TYPE='UT'; CAL_TYPE='GREGORIAN'; TIME_DIGITS='FRACSEC'
QUANTITIES='4'; APPARENT='AIRLESS'; CSV_FORMAT='YES'; EXTRA_PREC='YES'
```

Signed UI longitude stays −180…180; only upstream longitude is normalised.
Altitude policy −20…100 km is an application limit relative to the Horizons
reference ellipsoid, not terrain clearance. Time requires canonical UTC with
milliseconds; no rounding/time-standard/target-centre substitution.

AZ/EL is airless apparent topocentric direction, not a geometric state vector.
Above-zero elevation is a target-centre/reference-horizontal-plane test; it does
not establish terrain visibility, finite-disc illumination, eclipses, solar
power or communications availability. Metadata's HORIZONS_LUNAR_TOPOCENTRIC is
a descriptive observer-coordinate label, not a new NAIF frame. No kernel/model
version is invented when unavailable. API signature version is retained.

## 6. Mocked versus live verification

Controlled observer-table fixtures, explicitly labelled NOT recorded NASA
responses, test Sun/Earth parser values and software behavior. Historical
numbers come from the project prompt; they are not independently scientifically
verified merely by passing these tests.

Opt-in `H89_LIVE_SMOKE=1 npm run test:live` reached JPL, exited1 UNAVAILABLE:

```text
wldini(): missing required file LTKERNL; ;  ERROR in VLRDC: Var not declared: IP_ADDR
```

JPL returned HTTP200 error JSON, not valid geometry. Server logs preserve the
bounded exact diagnostic; client errors are safe and contain no angle values.
The corrected proxy invocation was tested after the original native-fetch
connectivity failure. No repeated unchanged retry loop or security bypass.
No successful LIVE numerical ephemeris or real-result cache has been verified.

## 7. Cache, validation and error behavior

- Decimal-only lat/lon/alt; finite/range checks; duplicate and unknown parameters
  rejected; strict valid canonical millisecond UTC.
- Upstream10 s timeout, 1,000,000-byte declared/streamed response limit,
  fixed JPL host, redirect refusal, no automatic retries.
- Parser checks target ID, Moon centre, AIRLESS declaration, UTC column/epoch,
  one row and marker pair, header-labelled columns, finite/ranged angles and CSV
  quoting. Actual successful live-table compatibility remains unverified.
- Successful per-target cache:120 s, max256 entries; key target + latitude +
  normalized longitude + altitude + exact UTC. Original retrieval times retained.
- Fresh/coalesced fetch LIVE; cache hit CACHED; failed pair UNAVAILABLE without
  scientific numbers. Mixed hit/fresh pair LIVE with individual cache metadata.
- Concurrent identical calls coalesce; max16 different pending target requests.
- Failures are not cached as valid geometry. One successful target may remain
  cached if its companion fails; no partial paired result is returned.
- Rate limit60/min/IP, at most1024 buckets, trust-proxy disabled, retry-after.
- JSON8 KiB, no-store/nosniff/API CSP/request IDs, no server stack or prompt echo.

## 8. Copilot security

GROQ_API_KEY and OPENAI_API_KEY were both unset in the runtime; names/presence
only inspected. Neither is requested or copied into source. Copilot remains
disabled even if keys are later set; valid requests return503 UNAVAILABLE.
The frontend still uses its standby dock and explicitly states providers are
not enabled. No successful provider test claimed. No secret values logged.
.env and local env variants are ignored; .env.example contains non-secret PORT
configuration and comments. Scan is heuristic, not a security certification.

## 9. Final validation

| Command/check | Result |
|---|---|
| npm ci --cache /workspace/.npm --no-audit --no-fund | PASS,182 packages |
| npm run typecheck | PASS: frontend, backend, shared, tests, config, live script |
| npm test |15 passed,0 failed,0 skipped |
| npm run test:backend |25 passed,0 failed,0 skipped |
| npm run test:science |7 passed,0 failed (integrity, not ephemeris calculations) |
| npm run lint |Oxlint:0 errors,3 existing React warnings; ESLint is not separately configured |
| npm run build |PASS |
| PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser |5 passed,0 failed |
| npm run check:secrets |0 flagged versionable text files |
| python3 science/scripts/verify_kernels.py |6 kernels verified |
| python3 science/scripts/fetch_kernels.py |Repeat-run verification PASS |
| git diff --check |PASS |
| H89_LIVE_SMOKE=1 npm run test:live |FAIL/BLOCKED: JPL LTKERNL/IP_ADDR error, exit1 |

Total deterministic tests52 (15+25+7+5), no final failures/skips. Initial checks
found one old client assertion tied to changed limitation wording and a TypeScript
test-header type error; both corrected without disabling checks. An initial
browser check could not read an evicted Chromium failed-response body; test now
verifies browser502 and UI plus the same error endpoint via APIRequestContext.
All5 browser tests passed afterward. The production response was not altered to
hide that test-tool issue.

Final browser uncaught page errors:0 in every test. Console error counts by test
were1,2,2,1,0 (6 total), arising from deliberately failed asset/API requests.
THREE.Clock deprecation and process NO_COLOR/FORCE_COLOR warnings remain.
No zero-console-error release claim. Browser reports/traces are ignored; CI
uploads failure artifacts. Hosted Actions execution is not independently checked.

Bundle JS1,177.39 kB raw /324.19 kB gzip (Phase One1,175.37 /323.56: +2.02/+0.63 kB).
CSS22.12 /6.74 kB gzip unchanged. >500 kB chunk warning remains. No hardware FPS
or GPU-memory certification. Lint warnings:clock Date during render and two
existing synchronous state-setting effects. No new lint warnings remain.

## 10. Remaining502 / upstream error

The old absent-local-backend ECONNREFUSED/proxy failure is fixed. A valid request
still returns502 intentionally because actual JPL reports its internal error.
Health200 and controlled fixture geometry/cache behavior are verified end-to-end;
real numerical geometry is NOT verified. This distinction is part of the API and
setup documentation, not hidden behind fallback values.

## 11. Kernels

All six existing pins/content sizes verified unchanged. Large files remain
ignored. No SPICE computations, segment-coverage queries, frame transforms or
scientific vector cross-checks were added or claimed. Exact manifest remains
`science/kernels/manifest.json`.

## 12. Missing assets and environment

Authentic LROC TIFF and derived real texture remain absent. Labelled neutral
reference sphere remains; no substitute imagery, fake bump/elevation or claimed
UV landmark validation. This source asset is a separate unresolved prerequisite.

Reusable install_script/start_skill updated for backend+frontend startup and
current tests. Draft save is separate from publication; no publication or new
machine restoration is claimed. Source preservation on the remote branch does
not depend on environment publication.

## 13. Uncommitted changes

Final implementation and this handoff are checkpointed on the dedicated feature
branch after final scans/tests; completion response records the SHA and remote
verification. No generated binaries or local env files included. No main merge
or force push. Final git status is checked for a clean tracked working tree.

## 14. Phase One acceptance

NOT YET SATISFIED. Secure source preservation, local API reconstruction and
fixture-based integration are complete, but actual successful JPL geometry and
genuine lunar imagery/orientation remain unverified. Do not call the scientific
backend fully verified or proceed into SPICE/Cesium/navigator features yet.

## 15. One recommended next milestone

Live Horizons validation: once JPL recovers, capture genuine successful Sun/Earth
responses for the specified epoch/site, reconcile parser format and historical
numerical precision, and verify real-result provenance/cache behavior. Do not
replace blocked JPL with modeled values. This follow-up has not been started.

STOP. No Solar System Navigator, Cesium, LOLA, SPICE computations, AI expansion
or major redesign was started.
