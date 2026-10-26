# HANDOFF TO CHATGPT

```text
CHATGPT HANDOFF — HORIZON 89

Task:
Phase One — repository truth, scientific foundation and reproducible baseline.
Safe foundation delivered; full Phase One scientific acceptance remains BLOCKED.

Repository reconciliation:
- indscope/horizon-89; branch work; initial/current HEAD f7a10e70303964f42b9b0fd90ee98927ce4fafec.
- Initially clean; HEAD equals origin/main. Remote only main; three commits.
- Read-only remote access verified through existing Git authentication.
- All refs/reflog/commit trees, git fsck and workspace searches found no recoverable prior backend/tests.
- No existing local-only commits or user changes were found; nothing discarded/reset.
- No previous backend was recovered or recreated. Other inaccessible cloud workspaces remain unknown.
- New changes are in the working tree for review, not committed/pushed. A clean source COPY was tested, not a fresh clone containing these unpublished changes.

Changes (complete versionable file inventory):
- .env.example
- .gitattributes
- .github/workflows/ci.yml
- .gitignore
- .nvmrc
- README.md
- docs/architecture.md
- docs/phase-one-handoff.md
- package-lock.json
- package.json
- playwright.config.ts
- science/kernels/README.md
- science/kernels/manifest.json
- science/scripts/fetch_kernels.py
- science/scripts/kernel_common.py
- science/scripts/verify_kernels.py
- science/tests/test_kernels.py
- scripts/check_secrets.py
- scripts/convert-moon.cjs
- shared/science.ts
- src/App.tsx
- src/components/MoonModel.tsx
- src/convert-moon.cjs
- src/science/horizons.ts
- src/services/horizons.ts
- src/styles/theme.css
- tests/browser/baseline.spec.ts
- tests/fixtures/horizons-legacy.json
- tests/horizons.test.ts
- tsconfig.tests.json

Package/config changes:
- @playwright/test 1.64.1 added as exact dev dependency with lockfile update.
- Node 24 declared via engines/.nvmrc; npm scripts for typecheck, client/integrity/browser tests, secret scan and source-dependent asset conversion.
- Local env files, kernels, browser outputs ignored. Existing CSS CRLF preserved; whitespace policy recognises it.
- Existing wire types, including SunGeometry/EarthGeometry exports, preserved in shared contracts.
- No Express, Cesium, SPICE runtime, terrain, or AI provider dependencies added.

Verified working:
- Frontend starts and returns lunar-ops HTML after restart.
- Missing-image reference sphere renders instead of crashing/blanking the app.
- Pointer drag/wheel events accepted without uncaught errors; interaction hint clears. Camera transforms were not scientifically measured.
- Site controls remain reachable at 390×844; reduced-motion setting exercised (full motion compliance not established).
- Wire-fixture precision/formatting, schema/input validation, exact UTC/signed longitude, request matching, safe failure handling.
- Kernel downloader successfully downloaded/verified all six files; repeat run verified existing files without changes.

Tests:
- npm ci: PASS, 108 installed packages, frozen lockfile; repeated in clean source copy.
- npm run typecheck: PASS (app + test/config/shared types).
- npm test: 12 passed, 0 failed, 0 skipped. These are CLIENT tests, not the historical ~30 backend tests.
- npm run test:science: 7 passed, 0 failed (kernel INTEGRITY, not scientific ephemeris computations).
- PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser: 3 passed, 0 failed in clean source copy.
- Initial mobile test failed because existing CSS hid controls; fixed and all 3 passed on rerun.
- Browser missing-texture test: 0 uncaught page errors; 2 console errors from intentionally failed HTTP requests. THREE.Clock deprecation warning remains. No zero-console-error release claim.
- npm run lint: exit 0; 0 errors, 3 warnings remaining (clock Date in render; two state-setting effects), down from 5 after removing texture mutations.
- npm run build: PASS. JS 1,175.37 kB raw / 323.56 kB gzip; CSS 22.12 kB / 6.74 kB gzip. >500 kB chunk warning remains.
- python3 science/scripts/verify_kernels.py: PASS all six content hashes/sizes.
- npm run check:secrets: 0 flagged text files (heuristic; not a security guarantee).
- git diff --check: PASS.
- npm run assets:moon: BLOCKED, exit 1: genuine source TIFF missing. Genuine asset conversion/orientation NOT run.
- Backend/API fixture tests, original cache tests, SPICE/Horizons cross-checks: NOT AVAILABLE/NOT RUN. No backend/runtime exists.

Horizons:
- Client GET /api/horizons forwards lat/lon/time to Vite proxy targeting 127.0.0.1:3001; client timeout 15 s.
- GET /api/health and /api/horizons via running Vite: HTTP 502, local backend absent.
- Direct official upstream requests for BOTH Sun and Earth reached JPL with HTTP 200 but error JSON: "wldini(): missing required file LTKERNL; ; ERROR in VLRDC: Var not declared: IP_ADDR".
- Tested request: Sun COMMAND='10' / Earth COMMAND='399'; CENTER='coord@301'; COORD_TYPE='GEODETIC'; SITE_COORD='0,-89,0'; EPHEM_TYPE='OBSERVER'; QUANTITIES='4'; APPARENT='AIRLESS'; TLIST='2026-10-10 06:00:00.123'; TLIST_TYPE='CAL'; TIME_TYPE='UT'; CAL_TYPE='GREGORIAN'; TIME_DIGITS='FRACSEC'; CSV_FORMAT='YES'; EXTRA_PREC='YES'; OBJ_DATA='NO'; MAKE_EPHEM='YES'.
- No backend parser, cache TTL or original retrieval timestamp implementation was recovered. Proposed historical cache: successful-only 120 s, keyed by target/site/exact UTC; NOT implemented here.
- Client fixture uses USER-SUPPLIED historical Sun AZ/EL 189.965237693 / 0.208258608, Earth AZ/EL 4.934865511 / -3.873679512. This is NOT a captured or independently verified JPL response.
- Angular UI now uses 3 decimals, explicit elevation signs, reference-horizon terminology and exact returned UTC.
- Legacy adapter does not invent retrieval UTC, altitude, frame or aberration metadata; unknown values remain null.
- Measurement model requested is AIRLESS APPARENT direction, not an uncorrected geometric vector. Elevation > 0 is target-centre/reference-horizon only.

Moon asset:
- Required source WAC_GLOBAL_E000N0000_008P.TIF: absent in working files, available history and workspace search.
- Generated real imagery: NONE. No substitute downloaded or invented.
- Converter prepares 1024×512, 2048×1024, 2880×1440 WebP (quality 90) + compatibility PNG + source/derivative hashes, tool versions and provenance if genuine source is supplied.
- Source identity still requires official metadata verification; no crop/AI enhancement/fake elevation.
- Removed image-based bump mapping. Lighting explicitly illustrative. UV/orientation/landmarks remain UNVERIFIED.

Kernel foundation:
- Set h89-de440-earth-261025-v1; 50,899,257 bytes total; all downloaded to ignored science/kernels/data.
- Pins measured from official certificate-verified NAIF HTTPS downloads and verified against independent second downloads. These are local pins, not publisher-signed SHA-256 metadata.
- naif0012.tls (LSK):
  URL: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls
  bytes: 5257
  SHA-256: 678e32bdb5a744117a467cd9601cd6b373f0e9bc9bbde1371d5eee39600a039b
  coverage: {"kind": "SUPPORT_KERNEL", "note": "No independent ephemeris interval; usable dates depend on companion binary kernels and model applicability."}
- de440s.bsp (SPK):
  URL: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/de440s.bsp
  bytes: 32726016
  SHA-256: c1c7feeab882263fc493a9d5a5b2ddd71b54826cdf65d8d17a76126b260a49f2
  coverage: {"kind": "DOCUMENTED", "start": "1849 DEC 26", "end": "2150 JAN 22", "timeScale": "TDB", "note": "Short DE440 SPK; inspect actual segment coverage/available body centres before engine activation."}
- pck00011.tpc (TEXT_PCK):
  URL: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc
  bytes: 131226
  SHA-256: 3dff7b1dbeceaa01f25467767d3fa25816051c85d162d1edf04acb310ee28bb1
  coverage: {"kind": "SUPPORT_KERNEL", "note": "No independent ephemeris interval; usable dates depend on companion binary kernels and model applicability."}
- moon_pa_de440_200625.bpc (BINARY_PCK):
  URL: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.bpc
  bytes: 12863488
  SHA-256: 60cd55aa401ea2ea97360636f567554bfe4e37bb829f901b4460a455dfaf783f
  coverage: {"kind": "OFFICIAL_COMMENT", "start": "1549 DEC 31 00:00:00.000", "end": "2650 JAN 25 00:00:00.000", "timeScale": "ET", "sourceUrl": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.cmt"}
- moon_de440_250416.tf (FK):
  URL: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf
  bytes: 19478
  SHA-256: a47c71e9c9f33796bdafb2c9d69a7ee447b6016ecad80f71cd6f3e479f9cf768
  coverage: {"kind": "SUPPORT_KERNEL", "note": "No independent ephemeris interval; usable dates depend on companion binary kernels and model applicability."}
- earth_000101_270121_261025.bpc (BINARY_PCK):
  URL: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/earth_000101_270121_261025.bpc
  bytes: 5153792
  SHA-256: 1ff7c46144b1a2cd10cb44642a71ed58c99870782ef5fe6b05aef5a8f2c0585d
  coverage: {"kind": "OFFICIAL_COMMENT", "start": "2000 JAN 01 00:01:04.183", "end": "2027 JAN 21 00:01:09.184", "timeScale": "TDB", "sourceUrl": "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/earth_000101_270121_261025.cmt", "note": "Mixed reconstructed/predicted Earth orientation; inspect comment and accuracy before scientific use."}
- Official lunar FK explicitly confirms compatibility with moon_pa_de440_200625.bpc. MOON_PA aliases MOON_PA_DE440; MOON_ME aliases MOON_ME_DE440_ME421, closely aligned with DE421 ME, not assumed identical.
- Earth kernel is dated ITRF93 snapshot, last data epoch 2026-10-25; predictions and coverage restrictions remain relevant.
- DE440s includes outer-planet barycentres rather than all body centres. Future engine must check target availability.
- Coverage above is documented from official/embedded comments. Actual SPICE load, segment queries, state/transform calculations and cross-checks remain UNRUN.

CI:
- .github/workflows/ci.yml: push/PR, read-only contents permissions, pinned action SHAs, no credential caches.
- Locked install, typecheck, lint, client fixtures, integrity tests, credential-pattern scan, build, Chromium smoke; failure reports uploaded for 7 days.
- Hosted GitHub Actions execution NOT run from this session. Equivalent available local commands passed.
- Live scientific schedule deferred until backend/parser recovery; PR checks do not depend on live JPL.

Security:
- No secret values requested, logged or added. Current frontend requires no credentials; AI remains UI-only.
- .env/.env.* ignored except placeholder .env.example; ignore behaviour checked.
- Safe client errors avoid upstream response bodies/stack traces. Server-side keys, validation, rate limits, headers/CSP, health/readiness and graceful shutdown cannot be verified without a server.
- Kernel downloads use official allowlist, TLS, size/hash checks, bounded streaming and atomic replacement; reject unresolved pins, tampering, symlinks and unapproved redirects.
- Credential-pattern scan covers versionable text files only, not all external history or ignored local files; no security certification claimed.

Performance:
- Bundle values above; no measured hardware FPS/GPU-memory claim.
- Reference sphere no longer crashes on image decode failure; texture cleanup is explicit.
- Real texture memory/performance untested because source is absent. No second rendering engine added.

Environment:
- Saved install_script and start_skill updated for tested commands and current limitations.
- Saved required custom domains: naif.jpl.nasa.gov, ssd.jpl.nasa.gov, ssd-api.jpl.nasa.gov, data.lroc.im-ldi.com, pgda.gsfc.nasa.gov, pds-geosciences.wustl.edu, cesium.com. Preset rules preserved.
- Initial official-source proxy 403s cleared after draft update; official docs/kernel downloads subsequently succeeded.
- Draft persistence confirmed, requires_publish true. Publication/fresh-task restoration NOT performed or claimed. Publishing is not required for current source inspection/editing.

Problems / blockers:
- Missing prior backend/tests and genuine TIFF are repository prerequisites, not fixed by publishing.
- Independent JPL upstream internal error blocks live numerical regression.
- Existing app loses previous successful analysis on failed new query; requested site/time is not isolated from confirmed analysis. Recovery/migration still needed.
- Three lint warnings, bundle warning, THREE.Clock deprecation, intentionally failing-request console errors remain.
- Full WCAG compliance, keyboard camera alternatives, authentic texture orientation and operational relay/communications are not verified.

Scientific status:
- LIVE geometry UNAVAILABLE; kernel integrity VERIFIED, celestial/terrain computation UNIMPLEMENTED.
- No computed SPICE vectors, physical terminator, terrain shadow, finite-disc/eclipses, solar-power or RF-link analysis.
- Proposed future vectors: J2000, explicit centre, exact UTC→ET, abcorr=NONE; apparent observer geometry separate. No such service is active.

Remaining work before Phase Two:
- Recover original backend/tests from project lead's prior workspace or separately authorise bounded reconstruction.
- Restore genuine TIFF/provenance and test derived asset orientation.
- Verify real Horizons/cache/provenance/failure/state-isolation against captured fixtures and live service when available.
- Validate kernel segment coverage/transforms with the later selected runtime before scientific claims.
- Commit/publish reviewed work through the normal project process; no GitHub push was performed here.

Questions for ChatGPT:
- Is a separately scoped backend restoration authorised if the original workspace cannot be recovered?
- Confirm product/dataset redistribution terms before scientific assets or hosted tiles are shipped.

Recommended next step (ONE task; not started):
Recover the previously verified backend and tests from the original workspace and reconcile them with this baseline. If unavailable, obtain explicit authorisation for a bounded backend restoration.

Please review Phase One and decide whether Horizon 89 is ready for Phase Two: the SPICE celestial-state engine. Current evidence does NOT satisfy the full Phase One science gate.
STOP. No Phase Two, navigator, Cesium, terrain or Copilot expansion was started.
```
