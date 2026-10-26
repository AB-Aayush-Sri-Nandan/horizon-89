# CHATGPT HANDOFF — HORIZON 89

Phase 2A — Scientific Celestial Engine. Local physical-state computation is
implemented and tested. No Solar System graphics, terrain, Cesium or AI expansion.

## Repository and checkpoint

Started clean on `feat/horizon89-phase1b-backend` at
`6e67a68a8fb0294cf60a595844e8d192346d1c20`, the accepted Phase1D baseline.
Changes are checkpointed on that same branch; the completion response supplies
its exact new SHA after remote verification. No reset, main merge or force push.
The dashboard, LROC runtime asset, original six kernel pins, Horizons behavior
and old scientific wire contract are preserved.

## Implementation and files

A private persistent Python/SpiceyPy worker owns one integrity-verified kernel
pool and serializes computations. Express adds independent state/capability
routes and bounds requests. Native scientific computation is isolated from the
Node event loop; no additional Python web framework or public service port.

Exact changed/added files:

- `.github/workflows/ci.yml`
- `.gitignore`
- `README.md`
- `docs/phase-2a-handoff.md`
- `package.json`
- `science/README.md`
- `science/app/engine.py`
- `science/app/worker.py`
- `science/evidence/phase-2a-results.json`
- `science/kernels/README.md`
- `science/requirements.lock`
- `science/scripts/export_evidence.py`
- `science/scripts/setup_science.sh`
- `science/tests/test_engine.py`
- `server/README.md`
- `server/app.ts`
- `server/index.ts`
- `server/spice.ts`
- `shared/celestial.ts`
- `shared/science.ts`
- `tests/backend/celestial.test.ts`

Runtime: Python3.12/Linux x86_64, SpiceyPy8.3.0, CSPICE_N0067, NumPy2.5.4.
Wheel hashes are locked; installation uses only binary wheels and requires hashes.
Python3.12.14 was used here. The platform-specific lock is not a claim of native
Windows/macOS readiness. Those need a separately reviewed lock or Linux/WSL use.
Saved install_script/start_skill now prepare the locked runtime and current checks;
no network/secret settings changed and publication was not performed.
No new npm dependency or lockfile change. Venv, wheel caches and large kernels
are ignored, not committed. No new secrets or disabled TLS/checksum checks.

Setup from repository root: `npm run science:setup`.
Tests: `npm run test:science` retains the original7 standard-library integrity
checks; `npm run test:celestial` runs actual SPICE using the prepared venv.

## Actual kernel/body/frame inspection

Every original kernel was size/SHA-256 verified before furnsh. Actual intervals
came from spkobj/spkcov/pckfrm/pckcov, not copied manifest annotations. No kernel
was updated, silently replaced, or supplemented.

- Kernel set: h89-de440-earth-261025-v1.
- Canonical-manifest set hash:0051f80c8df807add2edd22df5d2bad54d46a5f355a4b7403dc7f6cc85227f1b.
- DE440s has14 objects: barycentres1…9, Sun10, Mercury199, Venus299, Moon301,
  Earth399. All have ET coverage[-4734072000,4735368000], TDB1849-12-26 through2150-01-22.
- Mars499/Jupiter599/Saturn699/Uranus799/Neptune899/Pluto999 physical centre
  states are absent. They return UNAVAILABLE, never substituted barycentre vectors.
- Lunar binary frame31008: ET[-14200747200,20514081600], TDB1549-12-31 through2650-01-25.
- Earth binary class3000: ET[-43135.816087188054,853761669.1844847], approximately
  UTC2000-01-01 through2027-01-21. Last data epoch2026-10-25; later values include
  prediction. The dated snapshot is preserved, never replaced by a latest alias.
- Text PCK/LSK/FK do not have binary segment coverage. LSK last leap entry2017-01-01;
  frame aliases and generic polynomial orientation support were tested explicitly.

13 API body-fixed frames were actually transformed at2000,2010 and2026 epochs:

| Frames | Verified support/model |
|---|---|
|MOON_PA (31000)|Alias of MOON_PA_DE440 (31008), high-accuracy binary lunar orientation|
|MOON_ME (31001)|Alias of MOON_ME_DE440_ME421 (31009), fixed offset from PA|
|ITRF93 (13000)|Earth binary PCK class3000, bounded coverage; no approximate fallback|
|IAU_SUN, IAU_MERCURY, IAU_VENUS, IAU_EARTH|Generic analytic text-PCK models|
|IAU_MARS, IAU_JUPITER, IAU_SATURN, IAU_URANUS, IAU_NEPTUNE, IAU_PLUTO|Generic text-PCK orientation is available despite absent planet-centre SPK trajectories|

Text-PCK computability is not a certified accuracy interval; the API bounds its
generic evaluation domain to the pinned SPK span. The catalogue distinguishes
that policy from actual binary coverage. Other built-in SPICE frames are not
implicitly exposed as supported API inputs.

Full measured intervals, IDs/classes, model limitations, kernel filenames/hashes
and actual numerical results are in `science/evidence/phase-2a-results.json`.

## API and scientific contracts

- GET /api/science/capabilities — on-demand startup, actual coverage/frame catalogue.
- GET /api/celestial-state?utc=2026-10-10T06%3A00%3A00.123Z&centre=SUN&targets=399,301,4&frames=MOON_PA,MOON_ME,ITRF93

Default centre SUN; alternatives SSB/EARTH/MOON. Up to20 distinct numeric targets,
13 distinct verified frame names; input frame onlyJ2000, aberration onlyNONE.
No arbitrary executable, kernel path, frame or upstream URL is accepted publicly.
Capabilities rejects query parameters. State errors and missing individual items
are explicit UNAVAILABLE; partial results have complete:false, no placeholder
vectors. A valid request with no computable items is UNAVAILABLE, even if HTTP200.
Malformed inputs are400; unavailable worker/runtime is503.

All local results are COMPUTED, never LIVE. There is no new state-result cache,
so repeated numerical computation does not acquire a CACHED label. Existing
Horizons successful-only cache remains unchanged on its separate route.

One time path: canonical millisecond UTC -> str2et with pinned naif0012 -> TDB/ET
seconds past J2000. UTC inputs start1972; offset timezones, impossible dates,
pre1972 drift-era requests and leap-second-labelled :60 are rejected explicitly.
Unknown future leap seconds remain a documented LSK assumption, not predicted.

State vectors use spkezr(target,ET,J2000,NONE,centre), km and km/s. Simultaneous
physical geometry is kept distinct from Horizons apparent lunar AZ/EL. Immutable
Python dataclasses/tuples and recursively frozen gateway results protect state;
readonly TypeScript contracts contain no compressed coordinates or scene radii.
A future browser JSON consumer must also preserve immutability; transport alone
does not freeze objects. DisplayBodyState remains an entirely separate future type.

Orientation R=pxform(J2000,bodyFrame,ET), row-major, v_body=R*v_J2000. Quaternion
wire order isXYZW, converted from SPICE WXYZ. Angular velocity derives from the
full state transform derivative, cross(omega)=-R.T*dR/dt. Rotating-frame velocity
must use the6x6 state transform rather than only rotating a velocity3-vector.

Worker inputs are capped16KiB; gateway protocol buffer1MB, pending queue16,
startup/request deadlines10s. One startup attempt perAPI process; failure is
sticky until restart rather than an unbounded respawn loop. Worker failures do
not stop existing health/Horizons routes. Graceful API shutdown terminates it.

## Real calculations performed

Reference UTC:2026-10-10T06:00:00.123Z -> ET844884069.3053482 seconds past J2000 TDB.
Reference frameJ2000; geometric correctionNONE:

```text
Earth relative Sun, km:
[143191657.10583985, 39128656.45194106, 16960887.69793655]
Earth relative Sun, km/s:
[-8.988272659215596, 26.10243041474918, 11.31586453242432]

Moon relative Earth, km:
[-377462.81195273425, -61922.94115041855, -52528.05571858261]
Moon relative Earth, km/s:
[0.16764039167160402, -0.8966579595941946, -0.46403462333676376]
```

These were computed from the actual verified kernels, not historical project
numbers, mocks or fallback astronomy. Full states/matrices/quaternions at three
epochs are exported with runtime/kernel provenance and computation timestamps.

Lunar investigation:
- PA/ME full named aliases match their stable aliases; their relative rotation
  is fixed across tested dates. Rotation-angle separation is0.028863328209199266°.
  They are not the same frame, and ME421 alignment is not claimed exact identity.
- Geometric Earth-centre direction in MOON_ME varies across October2026:
  Oct1:(−1.192122551°,−6.659836472°), Oct8:(+4.614155346°,+1.565456925°),
  Oct15:(+2.083752722°,+6.483191680°), Oct22:(−5.824121873°,−0.930310886°).
  These are longitude-east/latitude, NOT apparent libration or a decomposition
  into optical/physical components. Binary orientation and orbital geometry both
  contribute; no constant-spin substitute was used.

Earth investigation:
- ITRF93 and explicitly requested IAU_EARTH differ by about0.08644090124703008°
  in rotation angle at the reference epoch. This is a model difference, not an
  independently measured error. ITRF93 never silently falls back after coverage.

Rotation investigation:
- Spin/orbit sign derives from angular velocity dot(r cross v), not PM-rate sign.
- Venus, Uranus and Pluto classify RETROGRADE. Other tested planetary/lunar
  frames classify PROGRADE; the Sun receives no planetary orbit-plane label.
- Outer-planet classifications explicitly use their system-barycentre orbital
  plane as a proxy, exposed as usesSystemBarycentrePlane:true and named target ID.
  This is not a substitution into a planet-centre trajectory request.

## Scientific tests, tolerances and validation

| Check | Result |
|---|---|
|npm run science:setup|PASS; hash-locked wheels installed; repeat setup reuses dependencies and verifies all6 kernels|
|npm test|21 passed,0 failed,0 skipped|
|npm run test:backend|31 passed,0 failed,0 skipped (25 existing +6 science-worker/HTTP tests)|
|npm run test:science|7 original integrity tests passed|
|npm run test:celestial|14 real-computation tests passed|
|npm run typecheck|PASS|
|npm run lint|Oxlint0 errors,3 existing React warnings|
|npm run build|PASS; JavaScript324.25kB gzip unchanged, existing chunk warning remains|
|PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser|7 passed,0 failed|
|npm run check:secrets|0 flagged versionable text files; heuristic only|
|git diff --check|PASS|

80 distinct tests passed (21+31+7+14+7), no disabled assertions, skips or counted
mock successes as live science. Existing browser screenshots ran only as required
regression tests; no extra preview/visual inspection was performed. Browser page
errors0; deliberate failed-request console errors1,2,2,1,2,0,0. Existing THREE.Clock
and process colour-setting warnings remain. Hosted GitHub Actions has the new
setup/computation steps but its execution is not independently claimed here.

Science tests exercise actual SPK/PCK boundaries, missing/corrupt files, time
roundtrip/J2000 anchor,14 target states at3 epochs, vector-chain closure and
spkgeo consistency, finite-difference velocity,13 frame matrices/quaternions/
derivatives at3 epochs, fixed lunar aliases, variable sub-Earth geometry,
Earth coverage failure, retrograde/prograde signs, physical immutability and
per-item unavailability. HTTP tests exercise actual Express/private Python calls,
concurrent epoch isolation and safe missing-runtime degradation.

Numerical tolerances are NOT physical ephemeris accuracy claims: state-chain
position1e-6km; direct same-kernel velocity consistency1e-11km/s;1s central
finite-difference velocity2e-6km/s including outer-planet float64 cancellation;
rotation orthogonality/quaternion2e-14;0.1s matrix finite-difference derivative
1e-9/s;0.2microsecond tolerance on the0.001s ET step. The same-kernel spkgeo check
is a consistency check, not an independent model oracle. No tolerance was invented
to pass a mismatched Horizons apparent/geometric comparison.

## Security, limitations and readiness

No JPL request or repeated failing connection was made. The existing Horizons
UNAVAILABLE behavior and LROC source/provenance/fallback are preserved. This
engine is usable independently of that remote failure, but independent matched
Horizons/vector-model validation remains pending. No global JPL outage assertion.

Pinned DE440 and generic PCK models have finite validity/accuracy limitations.
The Earth file includes predictions; the LSK does not predict future leap
seconds. Generic IAU models are not equal to high-precision Earth/lunar binary
orientation. No surveyed lunar imagery-to-ME registration, terrain/illumination,
occultation, RF budget, differential solar rotation or flight certification.

All new kernels/venvs remain ignored; the existing6 kernel files and hashes are
unchanged. No provider credentials are required or leaked. Runtime path overrides
are server configuration only. No user-facing Python port. Cache/queue resources
are bounded; no computation-per-render-frame frontend was introduced. The new
physical engine is locally verified; its external accuracy is not overstated.

## Recommended Phase2B (not started)

Implement a bounded sampled-state/series API plus immutable frontend mission-UTC
store and pure physical-to-display adapter before the Navigator consumes it.
Batch states instead of network calls per animation frame; key samples by kernel
set/epoch/centre/frame/correction and explicitly label interpolation. Verify
J2000/body/Three axis conversions, use R.T for body-to-inertial orientation where
appropriate, keep scene scale compression separate and visible, and retain
explicit system-barycentre identities. Rendering can then be separately authorised
against that adapter, with keyboard/reduced-motion and resource budgets.

Do not mix the new geometric state API into the apparent lunar telemetry as a
silent fallback. Independent cross-model validation remains a science review gate.

STOP after Phase2A. No navigator, Cesium, LOLA terrain or Copilot expansion started.
