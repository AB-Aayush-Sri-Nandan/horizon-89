# Phase 2A local celestial engine

This is an independent local physical-state layer, not a replacement for the
Horizons apparent lunar observer endpoint. No visualization or display compression
is implemented here. Source evidence: [actual calculations](evidence/phase-2a-results.json).

## Reproduce

Validated platform: Python 3.12 / Linux x86_64, Node 24.19.0. Hash-locked wheels
are SpiceyPy 8.3.0 (CSPICE N0067) and NumPy 2.5.4. The lock deliberately targets
that platform; Windows/macOS/other Python versions need a separately reviewed
wheel lock (or Linux/WSL deployment), not disabled hash verification.

```sh
npm ci
npm run science:setup
npm run test:science       # original integrity suite, system Python standard library
npm run test:celestial     # real SPICE calculations, science/.venv Python
npm run test:backend       # includes real worker/Express integration
npm run dev:api
```

`science:setup` creates the ignored `science/.venv`, uses pip `--require-hashes`
and `--only-binary=:all:`, and fetches/verifies the six existing pinned kernels.
No binaries/venv are committed, no trust checks disabled, no keys required.
Existing kernel files are verified/reused. `H89_SCIENCE_PYTHON` can select an
already prepared Python executable server-side; no executable/path is accepted
from an HTTP request. After fixing missing runtime/kernels, restart the API.

## Architecture and operations

Express lazily starts one private Python JSON-lines worker. The worker verifies
ALL kernel sizes/hashes before loading one pool and serializes SPICE calls; no
public Python HTTP port, thread-unsafe shared pool, per-request Python spawn or
network calculation. The gateway limits its pending queue to 16, enforces a
10-second startup/request deadline and a 1 MB protocol buffer cap. Private input
frames are limited to 16 KiB. Startup failure is sticky until restart, avoiding
a spawn/retry storm. The existing API rate limiter applies. SIGTERM/SIGINT closes
the worker. If Python is missing, old health/Horizons routes still work; only new
science routes return controlled UNAVAILABLE without paths or interpreter traces.

## API

```text
GET /api/science/capabilities
GET /api/celestial-state?utc=2026-10-10T06%3A00%3A00.123Z&centre=SUN&targets=399,301,4&frames=MOON_PA,MOON_ME,ITRF93
```

Capabilities dynamically inspects actual `spkobj/spkcov` and `pckfrm/pckcov`,
reports exact ET intervals, target identities, frame IDs/classes, alias definitions,
versions and kernel hashes. It also serves as on-demand local-science readiness.
Existing `/api/health` remains liveness and does not imply SPICE/JPL readiness.

State request policy:

- Required canonical UTC with milliseconds and Z, year >=1972. Invalid dates,
  offset timezones and leap-second-labelled `:60` are rejected. Before1972 the
  UTC drift convention is deliberately outside this API contract.
- `centre`: SUN (10), SSB (0), EARTH (399), MOON (301). Default SUN.
- `targets`: at most20 distinct numeric NAIF IDs. Default10,199,299,399,301,4,5,6,7,8.
  Unsupported body centres return per-body UNAVAILABLE, never substituted values.
- `frames`: optional distinct names from the verified frame catalogue (max13).
- Physical vector frame is ONLY J2000; `frame=J2000` and `aberration=NONE` may be
  explicit. Other values are rejected, not silently converted.
- Epochs outside actual state/PCK coverage return per-item KERNEL_COVERAGE_ERROR.
  Partial responses have `complete:false`. A response with no valid item is
  UNAVAILABLE. No placeholder vectors accompany unavailable items.

Every returned state is `COMPUTED`, not LIVE. There is no state-result cache:
repeated computations remain COMPUTED and retain exact input epoch. Provenance
contains the manifest-derived set hash, every pinned kernel via capabilities,
SpiceyPy/CSPICE versions, centre/frame/correction, computation time and limitations.
Schema `2A.1` does not alter the legacy Horizons wire schema. Endpoint responses
may be partial, so consumers must check each item's status, not just HTTP200.

## Actual support

SPK targets: barycentres1…9; Sun10; Mercury199; Venus299; Moon301; Earth399.
Mars499, Jupiter599, Saturn699, Uranus799, Neptune899 and Pluto999 are NOT in
DE440s. Planet-centre frames may still be supported independently by text PCK.
No planet centre is silently replaced by its system barycentre.

SPK coverage, all14 targets: ET[-4734072000,4735368000], TDB calendar
1849-12-26 00:00 through2150-01-22 00:00. The engine's UTC input policy starts1972.

Verified API body-fixed frames:

- MOON_PA (31000) aliases MOON_PA_DE440 (31008).
- MOON_ME (31001) aliases MOON_ME_DE440_ME421 (31009), a fixed offset from PA.
  Lunar binary frame31008 coverage ET[-14200747200,20514081600].
- ITRF93 (13000), binary class ID3000, ET[-43135.816087188054,853761669.1844847].
  Last Earth data epoch2026-10-25; later PCK values include prediction. No automatic
  IAU_EARTH fallback after coverage ends on2027-01-21 UTC.
- IAU_SUN, IAU_MERCURY, IAU_VENUS, IAU_EARTH, IAU_MARS, IAU_JUPITER,
  IAU_SATURN, IAU_URANUS, IAU_NEPTUNE, IAU_PLUTO: generic analytic text-PCK models.
  They have no segment-defined accuracy interval. API evaluation is bounded to
  the SPK epoch domain, without claiming equal accuracy over that interval.

Other built-in SPICE frames are not automatically part of this API contract.
The source FK explicitly pairs the pinned DE440 lunar PCK with the current FK.
ME is closely aligned with DE421 ME, not mathematically declared identical.
The binary lunar rotation encodes time-dependent orientation/libration rather
than a fabricated constant spin. Exported geometric sub-Earth directions show
variation, not an apparent-libration or optical/physical decomposition claim.

## Time, units, orientation and immutability

One path: canonical UTC -> `str2et(... UTC)` using naif0012.tls -> ET (TDB seconds
past J2000). No independent animation clock or UTC treated directly as ET.
The last leap entry is2017-01-01; future leap seconds are unknown. This is a
versioned LSK assumption, not proof that UTC after that date is independently
calibrated. No leap kernel is silently refreshed.

`spkezr(target,et,'J2000','NONE',centre)` returns km and km/s simultaneous geometric
states. They cannot be compared directly to Horizons apparent AZ/EL. No light-time
or display interpolation is introduced. Physical states use frozen dataclasses
and tuples; the gateway recursively freezes results, and TypeScript contracts
are readonly. JSON alone does not freeze a future browser's parsed object: its
consumer must preserve this boundary. No display/scene-unit fields occur in the
engine. The existing DisplayBodyState stays a separate future presentation type.

`pxform('J2000',bodyFrame,et)` returns row-major R with `v_body = R @ v_J2000`.
Quaternion wire order is XYZW (converted from SPICE WXYZ). Angular velocity uses
`sxform`'s derivative, `cross(omega) = -R.T @ dR/dt`, in J2000 rad/s. A 3x3 rotation
alone must NOT be used as the derivative of rotating-frame position; velocity
transforms need the full6x6 state transform.

Prograde/retrograde is derived by the sign of spin angular velocity dot orbital
angular momentum, not PM-rate sign or arbitrary axial-tilt constants. Venus,
Uranus and Pluto classify retrograde in the computed examples. Outer-planet
orbital-plane classifications explicitly use the corresponding system barycentre
state as a proxy; this is exposed in metadata and does not substitute trajectories.
The Sun has no planetary orbital-plane classification. No differential solar
rotation or detailed surface atmospheric rotation is claimed.

## Verification and limitations

14 real-computation tests cover actual coverage boundaries, missing/corrupt
kernels, immutable coordinates, UTC conversion/roundtrip, multiple epochs,
state-chain closure, spkgeo consistency, velocity finite differences, orthonormal
matrices/determinants/quaternions/derivatives, lunar aliases and varying sub-Earth
direction, Earth coverage and signed spin/orbit classification. Six new Node
checks exercise real private-worker and actual Express integration and failures.

Tolerances are numerical consistency bounds, not physical model accuracy:
1e-6km state-chain position;1e-11km/s direct CSPICE velocity consistency;
2e-6km/s finite-difference velocity (1s central step, outer-planet float64
cancellation);2e-14 rotation identity/quaternion consistency;1e-9/s rotation
finite-difference derivative (0.1s step);0.2 microsecond millisecond-step ET
roundoff allowance. Same-kernel internal checks are NOT an independent external
validation of DE440 or planetary orientation models.

Horizons remains blocked as recorded in Phase1C and was not retried. Independent
matched-centre/frame/epoch/aberration Horizons/SPICE cross-checks remain pending.
No ephemeris accuracy/flight qualification, terrain or calibrated illumination is
claimed. See official references:

- https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/spkezr_c.html
- https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/cspice/pxform_c.html
- https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/rotation.html
- https://naif.jpl.nasa.gov/pub/naif/toolkit_docs/C/req/time.html
- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf
