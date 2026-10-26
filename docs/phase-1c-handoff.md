# CHATGPT HANDOFF — HORIZON 89

Phase 1C: bounded live JPL diagnostics and scientific validation attempt.
Date: 2026-10-26. Outcome: scientific validation remains blocked. No production
code, parser rules, provider, dependency, cache policy or security setting changed.

## 1. Baseline, endpoints and diagnostic evidence

Started on `feat/horizon89-phase1b-backend`, clean, at
`dddaf621d260fda3f05c341be53cdc2351ae677e`, matching the remote feature branch.
No reset, rewrite or branch change. Backend started with `npm run dev:api` and
`GET http://127.0.0.1:3001/api/health` returned HTTP200, status OK,
`upstreamChecked:false`. This proves local liveness, not upstream readiness.

Consulted all three official sources over normal certificate-verified HTTPS:

- https://ssd-api.jpl.nasa.gov/doc/horizons.html — GET API documentation version1.3 (June2025).
- https://ssd-api.jpl.nasa.gov/doc/horizons_file.html — file API documentation version1.0.
- https://ssd.jpl.nasa.gov/horizons/manual.html — coordinates, time and observer quantity4.

[Machine-readable evidence](evidence/phase-1c-horizons.json) records exact public
request parameters, endpoints, UTC timestamps, HTTP codes, API signatures and
sanitized errors. No proxy credentials, environment dumps or session headers.

One local DNS lookup of `ssd.jpl.nasa.gov` failed `EAI_AGAIN`. This does not
establish failure of the configured proxy's own DNS resolution. HTTPS requests
through the existing proxy completed with certificate verification enabled.
No resolver, allowlist, proxy, TLS, trust-store or network policy was changed.
Existing Node `--use-env-proxy --use-system-ca` flags were used as in Phase1B.

Exactly FOUR remote API requests were made, serially, with no retries:

| Order | Query | Endpoint/method | HTTP | Response signature | Ephemeris |
|---|---|---|---|---|---|
|1|Official Mars control, COMMAND499|GET https://ssd.jpl.nasa.gov/api/horizons.api|200|NASA/JPL Horizons API,1.2|Absent|
|2|Existing lunar Sun, COMMAND10|GET https://ssd.jpl.nasa.gov/api/horizons.api|200|NASA/JPL Horizons API,1.2|Absent|
|3|Existing lunar Earth centre, COMMAND399|GET https://ssd.jpl.nasa.gov/api/horizons.api|200|NASA/JPL Horizons API,1.2|Absent|
|4|Official Mars batch-file control|POST https://ssd.jpl.nasa.gov/api/horizons_file.api|200|NASA/JPL Horizons API,1.0|Absent|

Every response was `application/json`,260 bytes, with the same sanitized error:

```text
wldini(): missing required file LTKERNL; ;  ERROR in VLRDC: Var not declared: IP_ADDR
```

GET responses identify version1.2 although current GET documentation says1.3;
the file response's1.0 matches its documentation. Version mismatch is recorded,
not explained away or treated as proof that a particular intermediary is at fault.
These observations apply to this environment's accessible service path, not all
JPL users. API signature strings are metadata, not cryptographic origin proofs.

## 2. Did the control query succeed?

Transport/HTTP succeeded; ephemeris generation did NOT. The documented Mars GET
example was used with its documented parameters, changing only `format=text` to
the supported `format=json` so error/signature fields could be compared:

```text
COMMAND='499'; OBJ_DATA='YES'; MAKE_EPHEM='YES'; EPHEM_TYPE='OBSERVER'
CENTER='500@399'; START_TIME='2006-01-01'; STOP_TIME='2006-01-20'
STEP_SIZE='1 d'; QUANTITIES='1,9,20,23,24,29'; format=json
```

One independent file-API POST used multipart `format=json` and an input text file
matching the official example, beginning `!$$SOF`, with `TABLE_TYPE='OBSERVER'`.
Exact batch text is preserved in the evidence. It produced the same error.
No alternative provider or production file-API migration was attempted.

## 3. Did the lunar Sun and Earth queries succeed?

No. Both returned error JSON without `$$SOE`/`$$EOE` or valid angle data.
The actual existing `scripts/live-horizons-smoke.ts` was invoked once with
`H89_LIVE_SMOKE=1` inside a temporary diagnostic harness. The harness serialized
and observed the two native fetch requests, recording a cloned response while
returning the original unchanged response to `HorizonsService`. There was no
substitute response, mocked data or second live-smoke request pair.

The bounded smoke exited1 with `UNAVAILABLE / UPSTREAM_UNAVAILABLE` and the exact
sanitized diagnostic above. HTTP200 was not treated as a successful measurement.

### Location of the failure

The documented non-lunar control, both lunar targets and independent file API
all fail identically without any observer table. This is consistent with a
shared initialization failure on this access path before ephemeris output;
it does not demonstrate a lunar parameter or local parser problem. `wldini`
plus a missing required file is initialization-related diagnostic text, but
without remote logs we cannot establish whether query validation ran first,
which remote component failed, or whether an intermediary reproduces the body.
No claim of a global outage, exact internal call order or local fix is justified.

## 4. Scientific conventions verified against documentation

The production builder was reviewed without weakening it:

```text
format=json
COMMAND='10' / '399'                 Sun / Earth centre
OBJ_DATA='NO'; MAKE_EPHEM='YES'
EPHEM_TYPE='OBSERVER'; CENTER='coord@301'
COORD_TYPE='GEODETIC'; SITE_COORD='0,-89,0'
TLIST='2026-10-10 06:00:00.123'; TLIST_TYPE='CAL'
TIME_TYPE='UT'; CAL_TYPE='GREGORIAN'; TIME_DIGITS='FRACSEC'
QUANTITIES='4'; APPARENT='AIRLESS'; CSV_FORMAT='YES'; EXTRA_PREC='YES'
```

- IDs10/399/301 identify Sun/Earth centre/Moon. No barycentre substitution.
- SITE_COORD is geodetic east longitude degrees, geodetic latitude degrees,
  height above the reference ellipsoid in kilometres. It is not a surveyed DEM
  elevation or necessarily height above the actual terrain.
- For the Moon, positive longitude is east; documented negative east longitudes
  are equivalent to360+value. The builder's positive-east normalization preserves
  that convention while the UI keeps signed longitude.
- The manual defines Horizons UT as UTC after1962 (before1962 it means UT1).
  Thus the selected2026 reference epoch uses UTC. Calendar TLIST retains .123;
  FRACSEC requests fractional-second calendar output. This does not establish
  arbitrary pre1962 UTC support or leap-second precision beyond the source model.
- Quantity4 is apparent topocentric azimuth/elevation, with light time,
  gravitational deflection, stellar aberration and other documented corrections.
  AIRLESS excludes atmospheric refraction; it does not mean geometric vectors.
- Azimuth is clockwise north0→east90→south180→west270, in degrees. Elevation is
  relative to the plane perpendicular to local zenith.
- Elevation>0 is a reference-horizon target-centre test, not terrain-corrected
  visibility, finite-disc illumination, solar power or guaranteed communications.

Parser review: `server/horizons.ts` requires the requested target, Moon observer,
AIRLESS declaration, one ephemeris block/row, airless apparent AZ/EL headers,
valid finite angular ranges and the exact requested UTC epoch. The official
manual's quantity4 labels distinguish `(a-app)` from `(r-app)`. Calendar FRACSEC
is documented as HH:MM:SS.fff. Controlled tests cover mismatched/reordered
columns, refracted tables, bad epochs and invalid values. None was relaxed.

The three consulted documents establish conventions and example table structure;
they do NOT supply a newly successful lunar CSV response here. Exact live CSV
compatibility, site-coordinate echo, source ephemeris model and full numeric
precision therefore remain unverified. No parser or scientific query fix was
justified by these error-only responses. API version mismatch also means future
successful output must be inspected before assuming unchanged formatting.

## 5. Historical numerical comparison

Not possible: no genuine Sun or Earth measurement was received.

| Measurement | Historical project reference (degrees) | New real value |
|---|---:|---|
|Sun azimuth|189.965237693|UNAVAILABLE|
|Sun elevation|+0.208258608|UNAVAILABLE|
|Earth azimuth|4.934865511|UNAVAILABLE|
|Earth elevation|−3.873679512|UNAVAILABLE|

Input:2026-10-10T06:00:00.123Z, latitude−89°, east longitude0°, altitude0km.
These historical figures remain unconfirmed project references, not ground
truth. No discrepancy, agreement, numerical tolerance or physical accuracy is
claimed from absent data. When real output is available, first inspect its
printed precision, epoch, target/observer, model/frame metadata and apparent
correction convention; justify rounding/model tolerances before deciding pass/fail.

## 6. LIVE/CACHED and cache expiration

Real LIVE retrieval, repeated CACHED values, preserved per-target retrieval times,
and real-data refresh after expiration are UNVERIFIED. The smoke stopped on its
unavailable path, so no expiry-triggered upstream requests were justified.

Existing deterministic cache tests passed: successful-only storage, original
retrieval times, TTL expiration, coordinate/altitude/millisecond keys, bounded
capacity, coalescing, failure rejection and subsequent success. These fixture
results are not described as live-cache validation. Production behavior remains
UNAVAILABLE with no scientific angles when upstream fails. Browser checks verify
that unavailable/pending requests do not display retained angles as current.

## 7. Files changed

Only these new text artifacts:

- `docs/evidence/phase-1c-horizons.json`: real diagnostic metadata, exact parameters,
  API signatures and sanitized error evidence for the four-request sequence.
- `docs/phase-1c-handoff.md`: this scientific/diagnostic handoff.

No application logic, parser, test expectations, provider, lockfile, network
configuration, secret binding or installed kernel was changed. The temporary
transport-observation harness was outside the checkout and is not a production
component. Evidence records preserve sufficient request information for review
without an automatically retrying probe in CI.

## 8. Tests and build

Baseline/current checks are rerun against unchanged production code:

| Command/check | Result |
|---|---|
|npm test|15 passed,0 failed,0 skipped|
|npm run test:backend|25 passed,0 failed,0 skipped|
|npm run test:science|7 passed,0 failed; integrity only|
|PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser|5 passed,0 failed|
|npm run typecheck|PASS|
|npm run lint|Oxlint:0 errors,3 existing React warnings|
|npm run build|PASS; JS1,177.39kB raw/324.19kB gzip, unchanged|
|npm run check:secrets|0 flagged versionable text files; heuristic only|
|git diff --check|PASS|
|Existing production live smoke, serialized/captured by diagnostic harness|Exit1, UPSTREAM_UNAVAILABLE; two real requests, included in four-request budget|

Total deterministic tests52; live science failed separately and is not counted
as passing. Every browser test recorded0 uncaught page errors; console-error
counts were1,2,2,1,2 (8 total), from intentional failed asset/API requests.
The existing THREE.Clock deprecation and process colour-setting warnings remain. The >500kB chunk warning remains. No new hosted CI result, physical
science calculation or successful real API parser run is claimed.

## 9. Git checkpoint

Changes are committed and pushed only to the existing dedicated feature branch
`feat/horizon89-phase1b-backend`; completion response records the resulting SHA
and remote verification. No force push or merge to main. The evidence/report
commit changes no production behavior. No environment publication is required
to preserve this diagnostic checkpoint on GitHub.

## 10. Remaining blockers and supplied TIFF

- Real JPL observer output remains unavailable on this path, including the
  documented control; the cause cannot be localized further without remote or
  environment-operator evidence. GET version1.2 versus documentation1.3 remains
  unexplained. Local DNS EAI_AGAIN is a distinct observation, not proof of the
  initialization error's cause.
- Numeric historical comparison and real-result cache validation remain blocked.
- An attachment named `WAC_GLOBAL_E000N0000_008P.TIF` was supplied in this turn.
  It was not interpreted as instructions, downloaded into the repository,
  authenticated, converted or used to claim real imagery. Restoration is outside
  this explicitly scoped connectivity milestone; do not ask for another upload
  merely because the runtime asset is still absent. The existing honest neutral
  sphere fallback remains, as do illustrative lighting limitations.
- No SPICE computation, terrain, navigation or Copilot expansion was started.

## 11. Recommended next scientific milestone

Resolve the accessible JPL service-path problem using this diagnostic evidence
with the appropriate operator/support, then perform ONE bounded real Sun/Earth
retrieval, historical comparison and real-cache validation after a meaningful
service/path change. No support messages were sent by this agent and no new
provider is proposed as a silent replacement. Do not repeat unchanged requests
or start a new architecture phase to conceal the blocker.

STOP. Scientific acceptance remains pending successful real results.
