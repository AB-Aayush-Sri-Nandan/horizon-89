> Current opening experience and delivery: see [Phase 4 handoff](docs/PHASE4_HANDOFF.md). Historical Phase 1–3 counts and default-screen descriptions below are retained for context.

> Current release: see [Phase 3 handoff](docs/PHASE3_HANDOFF.md). This file retains the Phase 1/2 audit and historical results; Phase 3 results supersede earlier release counts.

# HORIZON 89 — Phase 2 engineering handoff

Phase 2 completed local implementation and verification on 2026-11-08, continuing the existing `feat/horizon89-mission-platform` branch. All prior uncommitted files were preserved; no reset, new application, force-push, deployment, environment-settings update or publication occurred. A pre-change source archive exists outside the checkout at `/workspace/horizon89-phase2-baseline.tgz`. The Phase 1 handoff is retained below as historical context; the results and limitations in this Phase 2 section supersede its earlier test counts and availability descriptions.

## Phase 2 audit and concrete findings

Read current Git branch/status, README/HANDOFF, manifests/lockfile, backend/client geometry, catalog, viewer, science interface, comparison/chat state, existing tests and cloud runtime policy. The prior implementation was present as uncommitted changes on the same feature branch. No AGENTS.md was found. No authoritative DEM, PSR product, surveyed coordinate record or server AI key was present. Cloud status showed no configured secret/runtime bindings; variable names and `.env` existence were inspected without exposing values. No real AI response was attempted because the key was absent.

Fresh authoritative-source probes, including actual downloader execution, were denied by the proxy at CONNECT (HTTP 403): PDS Geosciences, MIT LOLA team, USGS Astrogeology, NASA PGDA, LROC and JPL. There was no valid product label/body available to establish metadata or coordinates. This is an external access blocker, not evidence that those products do not exist.

## Implemented Phase 2 changes

1. **Terrain ingestion architecture:** `src/science/terrain.ts` parses a constrained, explicit PDS3 detached DEM subset, validates units/conventions/spherical projection metadata, decodes signed integer/float endian formats, preserves no-data before scaling, transforms geographic/projected coordinates and derives native central-difference slopes where supported. Unsupported/ambiguous encodings/projections fail closed.
2. **Reproducible retrieval/conversion:** `scripts/science/fetch-dem.mjs` restricts downloads to authoritative HTTPS hosts, retains TLS/proxy trust, bounds size, streams hashes and prevents overwriting downloaded files. `ingest-dem.ts` verifies file identity/size, optional publisher SHA-256 and reviewed provenance, uses a 16-row cache, emits a bounded sampled tile and preserves the full original label/review/hashes in a sidecar. No real lunar product was ingested here. End-to-end binary tests use synthetic fixtures in temporary directories only.
3. **Optional layers:** `server/science.ts` and `/api/science` serve a validated small artifact or an explicit unavailable inventory; `useTerrain` loads it once with cancellation/timeout. `TerrainPanel` adds independent elevation/slope controls, a numeric/unit legend, source/datum/epoch/integrity details, selected samples and explicit disabled PSR/illumination states. `MoonViewer` can show sourced color points above the existing natural Moon. This is explicitly a display color overlay, **not terrain displacement/relief geometry**. No actual overlay is enabled in the shipped state because no reviewed dataset exists.
4. **Transparent analysis:** `SiteComparison` compares the current study target and mission choices, showing coordinate confidence, DEM coverage/elevation/slope when available, and unavailable roughness, illumination, PSR proximity, Sun/Earth comparisons. There is no invented aggregate suitability score.
5. **Mission provenance gate:** catalog records now distinguish landed/no-landing outcomes and reviewed scientific-result availability. Exact coordinates require an as-landed evidence record with convention, source URL/date, review date, precision and optional uncertainty. Planned targets/non-landing missions cannot create markers. No new exact coordinates or unverified mission outcomes were inserted. All three existing missions/history/search/provider filters remain.
6. **Horizons correctness:** requests explicitly set UT calendar fractional-second output. The parser requires a complete ephemeris table and checks the returned calendar instant, rejecting wrong dates/seconds instead of simply relabeling it with requested UTC. API dates are restricted to 1962–2100 so pre-1962 Horizons UT1 is not silently called UTC. Client checks numeric bounds and returned timestamps when supplied. A controllable internal test clock demonstrates cache expiry/refetch.
7. **Reference verification runner:** `verify-horizons.ts` stores raw successful official responses, hashes, exact requests and status for eight site/body/time cases; it exits nonzero on failures and never manufactures responses. Independent official web/batch cross-checks remain a separate required step, even after retrieval succeeds.
8. **Copilot:** real existing server integration now receives the mission catalog, up to two validated comparison missions, selected study coordinate/UTC/object, terrain metadata/provenance/sample if imported and matching cached sourced geometry. UI adds comparison context, scientific question suggestions and returned context-source links. Request validation happens before missing-key handling for UTC/site errors. No hardcoded answer or new secret is shipped.
9. **UI preserved:** existing identity, large natural Moon, camera/target/timeline controls, source links, mobile/tablet behavior, error recovery and schematic Solar System remain. New science controls fit the existing design.

## Scientific methods and dataset inventory

See [INGESTION.md](docs/science/INGESTION.md) for exact projection/pixel-center equations, scaling/no-data rules, native-slope method, local stereographic scale correction, bounded output coverage, precision limits, licensing review and exact ingestion commands. See [candidate-inventory.json](docs/science/candidate-inventory.json) for blocked source candidates and explicit null metadata. The candidate filenames are **unverified discovery leads**, not validated product identifiers or evidence of geographic coverage/resolution. No guessed publisher checksum or license is inserted.

Supported decoder subset: PDS3 detached filename-only image pointer; single-band unpadded signed int16 or float32; explicit scaled height metres, numeric missing value, east-positive planetocentric coordinates and spherical lunar reference radii; equatorial equirectangular or pole-centered stereographic. PDS4/GeoTIFF/ISIS, attached/offset or packed rasters, west-positive/triaxial products, multiline values and other projections remain unsupported. Real LOLA label compatibility/registration has **not** been established by synthetic tests.

The default generated grid is 181×91 (16,471 cells), 80°S–90°S and −180°–180° east-positive longitude. Native map scale is retained separately from display-grid spacing. Query values are nearest contextual samples; original pixel centers may differ. Native finite-difference slopes are computed only for polar stereographic with valid neighbors; cylindrical slopes remain unavailable. Product creation time is a processing epoch, not an asserted acquisition epoch. The original label retains other source metadata for review.

No terrain-dependent illumination, PSR proximity, crater labels, ice, roughness, accessibility, terrain LOS or link-budget calculations are implemented. No photographic brightness is treated as elevation, and no map is called permanently shadowed because it looks dark.

## Actual verification results

| Command / check                                                  | Phase 2 outcome                                                                    |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm ci --cache /workspace/.npm --no-audit --no-fund`            | Passed; executed locked installation                                               |
| `npm run lint`                                                   | Passed, zero warnings/errors                                                       |
| `npm run build`                                                  | Passed frontend type check, Vite build and strict backend TypeScript               |
| `npm test`                                                       | **30 passed**, 0 failed/skipped/cancelled                                          |
| `npm run test:browser`                                           | **6 passed**, 0 failed/skipped                                                     |
| `npm run science:verify-horizons -- .data/horizons-verification` | **Failed/blocked: 0 of 8 upstream requests retrieved**, exit 1; no live validation |
| Actual `science:fetch` PDS candidate attempt                     | Failed at proxy CONNECT 403; no raw/partial product retained                       |
| Source probes for PDS/LOLA/USGS/PGDA/LROC/JPL                    | Blocked by proxy CONNECT 403                                                       |
| Real AI generation                                               | Not run: no server key configured                                                  |
| `git diff --check`                                               | Passed                                                                             |

Unit/API tests cover PDS metadata/rejection, duplicate fields, byte order, units, scaling, no-data and nonfinite samples, polar/cylindrical coordinates and inverse transforms, slope math/local spacing, complete CLI binary ingestion/provenance, truncated-file rejection, terrain artifact validation, UTC leap-day/midnight and returned-time mismatch, pre-1962 rejection, network/timeout handling, stale cache expiry and mission coordinate provenance. Existing API/client controls remain covered.

Six actual Chromium workflows cover the previous four desktop/mobile/tablet control/navigation/rendering/recovery contracts, plus science availability/evidence comparison/mobile overflow, and optional terrain layer plumbing using explicitly synthetic route fixtures. **The fixture overlay test is not a demonstration of real lunar terrain.** No synthetic test terrain is present in `public/` or deployed as a fallback. Browser tests retain initial globe GPU texture-detail checks, stale response rejection, missing key, source controls, timeline, mission selection and Solar System round trips.

Actual browser captures were visually inspected. `docs/phase2-comparison.png` and `docs/phase2-science.png` show the real evidence-gap states; existing captures were refreshed by the browser suite. No newly introduced uncaught browser failures were observed. Expected failed remote geometry/AI requests and deliberately aborted image tests are distinguished from broken static resources. Physical Intel MacBook GPU, Safari, true touch hardware, real DEM rendering and live provider performance were not tested.

## Performance observations and limits

No raw DEM is loaded in the browser or committed. Download/hash streaming, 16 cached native rows (at most ~6.4 MB under supported caps), a ~16k-cell output, runtime 2 MB/361×181 caps and disposable bounded overlay buffers keep data work bounded. The existing 1024×512 texture, lazy 3D imports, modest geometry, on-demand rendering and default DPR cap remain. No massive new runtime dependency was added. Vite still warns about the shared lazy 3D chunk; this warning is preserved. These are implementation bounds/software-browser observations, not measured target-MacBook FPS, memory-leak proof or a promise of native-resolution terrain performance.

## Exact installation, run and scientific verification commands

```sh
cd /workspace/horizon-89
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Production/local demonstration:

```sh
npm run build
npm start
```

API port defaults to 3001. Dev Vite proxies it. `HOST=0.0.0.0 PORT=3001 npm start` is available for an explicitly configured deployment, but none was performed here. Existing Node 24.22.1/npm 11.9.0/system Chromium were used; no new runtime packages were introduced in Phase 2.

```sh
npm run science:verify-horizons -- .data/horizons-verification
npm run science:fetch -- "$REVIEWED_LABEL_URL" "$REVIEWED_IMAGE_URL" .data/lola "$PUBLISHER_SHA256"
npm run science:ingest -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json public/science/terrain.json
npm run build
npm start
```

The retrieval/ingestion commands require **actual reviewed products and provenance** as detailed in [INGESTION.md](docs/science/INGESTION.md). Placeholders are not valid scientific inputs. Rebuild/restart after import. No hidden source edits are needed to enable a validated artifact.

Environment variables remain `H89_AI_API_KEY` (server-only, absent), `H89_AI_MODEL` (default `gpt-4.1-mini`), `PORT`, `HOST`, inherited proxy/CA variables and optional `CHROMIUM_PATH`. Existing scripts enable Node proxy use. Supply any real key securely in environment/deployment settings or ignored local `.env`, never chat or frontend variables. Required remote access: the selected authoritative DEM source, `ssd.jpl.nasa.gov`, `api.openai.com`, and official LROC/NASA/provider sources for coordinate review. No settings were broadened or published by this task.

## Completed / partial / unavailable checklist

| Capability                                                      | Current state                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Existing Moon/control/catalog/timeline/atlas                    | Preserved; builds and browser tests pass                                  |
| PDS3 decoder, transforms, no-data, slope math, binary ingestion | Implemented and synthetic-fixture tested; real-product validation pending |
| Source provenance/hashes/metadata capture                       | Implemented; no real product was acquired                                 |
| Elevation/slope layer controls and optional bounded overlays    | Implemented; browser-contract tested; disabled in actual state            |
| Terrain relief geometry                                         | Unavailable; color overlay is not relief                                  |
| Illumination / PSR layers                                       | Unavailable with evidence explanation; not calculated                     |
| Location comparison with missing evidence visible               | Complete and browser verified                                             |
| As-landed coordinate schema/gate                                | Implemented/tested; actual coordinates still unverified and absent        |
| Independent live JPL validation                                 | Blocked: 0/8 upstream cases; runner/protocol delivered                    |
| AI context/comparison/source improvements                       | Implemented and contract tested; real answer blocked by missing key       |
| Target-MacBook performance / actual geospatial registration     | Unverified                                                                |
| Updated demo, project description, source inventory and handoff | Complete                                                                  |

## Changed/new files in Phase 2

Modified: `src/App.tsx`, `src/components/MoonViewer.tsx`, `src/components/Copilot.tsx`, `src/components/Telemetry.tsx`, `src/services/horizons.ts`, `src/data/catalog.ts`, `src/styles/theme.css`, `server/index.ts`, `server/horizons.ts`, `package.json` (scripts only), `.gitignore`, existing browser workflow tests, README/HANDOFF and demo/project docs. Prior lockfile changes belong to Phase 1; no new Phase 2 dependency was installed.

Created: `src/science/{terrain,useTerrain}.ts`, `src/components/{TerrainPanel,SiteComparison}.tsx`, `server/science.ts`, `scripts/science/{fetch-dem.mjs,ingest-dem.ts,verify-horizons.ts}`, `tests/{terrain,phase2-api}.test.ts`, `tests/browser/science.spec.ts`, `docs/science/{INGESTION.md,HORIZONS-VALIDATION.md,candidate-inventory.json,provenance.example.json,horizons-verification-2026-11-08.json}` and `docs/phase2-comparison.png` / `docs/phase2-science.png`. Ignored `.data/` contains the local verification report; it contains no provider key. Raw datasets and generated science products are ignored.

## Remaining blockers and recommended next actions

1. Permit access to authoritative candidate catalogs, select a real suitable product, verify every metadata/licensing field, retrieve and checksum it, run ingestion, then independently compare geographic source pixels/registration. The current decoder may reject unsupported real products; extend it only against reviewed examples.
2. Retrieve an actual documented PSR/illumination product or implement a validated terrain-horizon method. No illumination, permanent shadow or ice claim is presently warranted.
3. Obtain independently reviewed **as-landed** coordinate sources for IM-1/Blue Ghost, including convention/date/precision/uncertainty. Do not use a planned target. Keep Peregrine classified as no landing.
4. Permit JPL, rerun all eight cases and independently compare official web/batch outputs as documented in [HORIZONS-VALIDATION.md](docs/science/HORIZONS-VALIDATION.md). Successful retrieval is not independent validation.
5. Configure the server AI key/provider access and test a real sourced answer and follow-up. Until then only missing-key and mock-transport contracts are verified.
6. Verify real data/performance on the target Intel MacBook and Safari before claiming those hardware results.

The implementation can be demonstrated now for imagery, mission history, evidence comparison and explicit scientific limits. Real terrain/illumination, exact landing markers, independent live ephemerides and AI answers remain partial or unavailable, for the concrete reasons above. The [updated 90-second demo](docs/DEMO.md) includes honest alternatives for each missing prerequisite.

---

# Historical Phase 1 handoff (retained, not current test results)

# HORIZON 89 — Engineering handoff

Implementation and verification date: 2026-11-08. Branch: `feat/horizon89-mission-platform`. Baseline commit: `f7a10e70303964f42b9b0fd90ee98927ce4fafec`. Changes are local and reviewable; no push, deployment, environment draft update or publication was performed for this build request.

## 1. Repository audit

Inspected repository structure, README, manifests and lockfile, TypeScript/Vite/Oxlint configuration, HTML entry point, all application/service entry points, current styles, asset inventory, optional Moon conversion helper, Git status/branch and available runtime settings. No AGENTS.md, HANDOFF.md, backend, test suite, real CLPS catalog, data manifest, terrain dataset, texture directory, duplicate application or old ZIP implementation was present. The checkout began clean on branch `work`.

The baseline was React 19 + TypeScript 6 + Vite 8, with Three.js/React Three Fiber/Drei and a single large App component. It offered a manually selected south-pole target, two unsourced mission placeholders, a missing `/textures/moon-lro.png`, an absent backend proxy target at port 3001, illustrative curves, a simulated clock, graphics controls and a Copilot standby message. Its build worked, but this did not establish a working application. The absent texture could break the scene, and geometry requests failed.

## 2. Implemented product

### Lunar Mission Control

- Default, immediately accessible mission-control screen without an artificial boot delay.
- Black/charcoal interface with crimson brand accents, cyan coordinates and readable technical hierarchy.
- Lazy-loaded textured Moon, natural grayscale appearance and spherical geometry.
- Real bundled lunar imagery with verified JPEG format, dimensions, hash and HTTP path.
- Mouse/touch OrbitControls for rotate, zoom and pan; reset and selected-coordinate focus; 89°S shortcut.
- Optional geographic grid, cyan target marker and double-click surface-coordinate selection.
- Explicit image-loading/failure states; visible untextured sphere if the image fails; error boundary with image-map fallback if 3D fails; reload after texture failure or context loss.
- Low/medium/high graphics choices, persisted when local storage permits. Default DPR cap 1.25, modest geometry, no background particle field, on-demand rendering and resource cleanup.

### Mission intelligence & science

- Three curated historical CLPS mission records with providers, destination descriptions, selected payloads, dated events and official source references.
- Search and provider filtering, selection, detail panels, mission comparison and event-to-UTC-date navigation.
- Explicit null mission coordinates instead of guessed landing markers; user-entered study targets remain available.
- Science workspace with dataset filtering, source links and distinctions between imagery, calculated observer data and missing terrain products.
- No fake trend curves. No brightness-derived bump, elevation, slope, shadow, ice or accessibility claims.

### Time, APIs & Copilot

- Validated manual latitude/longitude, east-positive coordinates and UTC-only date arithmetic.
- Date selection, day scrubber, 1×/60×/600× playback, pause-to-query behavior and restart at day end.
- Native TypeScript Node HTTP server, same-origin production static serving, health route and safe JSON errors.
- Horizons request validation, lunar geodetic observer construction, source/frame/unit/timestamp metadata, conservative parser, 12-second remote timeout, 100-entry five-minute cache and concurrent-request deduplication.
- Client debouncing/cancellation and rejection of responses for a different site or UTC instant. Stale values are hidden during query/playback changes.
- Real OpenAI server integration with contextual catalog/datasets, selected Solar System object, study coordinate, simulation instant and matching cached sourced geometry when present.
- Bounded user/assistant history, question/body limits, server-only key, timeout, missing-key/error states, and copying generated responses. No hardcoded simulated assistant answers.
- Basic process-local API request limit and same-origin checks.
- One `npm run dev` command compiles/watches server sources, runs the API and starts Vite; production starts with `npm start` after build.

### Solar System

- Separate lazy-loaded secondary atlas with Sun, Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn, Uranus and Neptune.
- Selectable objects and camera focus; orbital guides, play/pause/reset, rings and enlarged Earth-relative Moon orbit.
- Fact panels and NASA references. All orbital paths, positions, sizes and phases are explicitly schematic; no true scale or real-time ephemeris assertion.

## 3. Preserved functionality

Preserved the existing React/TypeScript/Vite/R3F architecture, fonts and icon system; manual targeting; coordinate display; Moon interaction; target focus; quality choices; UTC playback controls; Copilot prompt suggestions and response copying; keyboard command entry; and external-source attribution. Existing unused baseline assets/styles/conversion helper remain in the checkout. Source was separated into components because the original scene, telemetry and chat were tightly coupled in one component. Unsourced mission placeholders, fake trend lines and the missing-texture dependency were replaced for specific correctness reasons.

## 4. Changed and created files

Modified tracked files:

- `.gitignore`: server output, secrets and test artifacts.
- `README.md`: actual product, architecture, source, setup, API, deployment and limitation documentation.
- `package.json`, `package-lock.json`: development/build/test scripts, Node requirement and Playwright development dependency. Existing runtime dependencies retained.
- `index.html`: product identity, description and theme.
- `src/App.tsx`: workspace navigation, mission/science interfaces, selection and timeline orchestration.
- `src/main.tsx`: formatting only; the entry point and existing fonts remain.
- `src/services/horizons.ts`: typed response/client boundary, timeout and errors.
- `src/styles/theme.css`: consistent responsive design system.

Created:

- `.env.example`, `.nvmrc`, `tsconfig.server.json`, `playwright.config.ts`.
- `scripts/dev.mjs`.
- `server/index.ts`, `server/horizons.ts`.
- `src/components/{MoonViewer,Telemetry,Copilot,SolarExplorer,SceneBoundary}.tsx`.
- `src/data/catalog.ts`, `src/lib/science.ts`.
- `public/favicon.svg`, `public/textures/moon.jpg`, `public/textures/README.md`, `public/textures/THREE-LICENSE.txt`.
- `tests/api.test.ts`, `tests/science.test.ts`, `tests/browser/workflows.spec.ts`.
- `HANDOFF.md`, `docs/DEMO.md`, `docs/PROJECT.md` and real browser screenshots under `docs/`.

Generated `node_modules`, `dist`, `dist-server` and test output are ignored. Temporary tooling/capture helpers outside the repository are not application dependencies. Earlier onboarding helper files outside this checkout were not reapplied or used to modify environment settings.

## 5. Architecture

App state owns the selected mission/study location, UTC simulation instant, navigation and graphics settings. Viewer modules are dynamically imported. `Telemetry` handles request lifecycle, freshness and honest unavailable states. `Copilot` owns transient conversation UI; the backend supplies trusted catalog context. `src/data/catalog.ts` is the typed provenance/availability manifest. Geographic and time helpers live in `src/lib/science.ts`.

The backend uses Node built-ins and fetch; no new runtime framework was introduced. Development Vite proxies `/api` to the API server. Production Node serves both `dist/` and `/api`. The build emits strict backend TypeScript plus its catalog dependency under `dist-server/`. API caches and limits are instance-local and bounded. Provider keys never enter frontend build variables.

## 6. Scientific provenance

- Mission facts are curated historical transcriptions of the cited NASA references, with per-record snapshot dates. They are not current operational statuses. This environment could not re-fetch NASA pages, so source-link reachability and live content changes are not verified here.
- IM-1: launch 2024-02-15, landing 2024-02-22, Malapert A region; NASA IM-1 reference.
- Blue Ghost Mission 1: launch 2025-01-15, landing 2025-03-02, Mare Crisium; NASA CLPS reference.
- Peregrine: launch 2024-01-08, mission ended with Earth reentry 2024-01-18; NASA CLPS reference.
- All mission surface coordinates are null. Exact as-landed positions were absent from the repository and were not independently verified during this task. Mission selection therefore never silently focuses a made-up coordinate.
- The manual default −89°, 0° is a study target, explicitly distinct from a mission landing site.
- Moon imagery: bundled Three.js `moon_1024.jpg`, 1024×512 sRGB JPEG, 238,093 bytes; SHA-256 `fcb0f1f5548e6e18d40063dd55c6aacd3daedf2407b181dab85b61e22bf9fe57`. Verified HTTPS download and bundled upstream MIT license. Acquisition/calibration/registration metadata was not supplied upstream; no LRO instrument attribution or precision registration is asserted.
- Photographic imagery is not elevation and is never used as displacement/bump data. Viewer illumination is fixed studio lighting, not simulated sunlight.
- Horizons requests use Sun 10 and Earth 399, geodetic surface observer `coord@301`, height 0 km, east-positive longitude, UTC and airless apparent azimuth/elevation. Successful results are labeled calculated with requested/fetched timestamps and frame. Azimuth is north through east, in degrees. Live frame/numerical validation against JPL still requires accessible upstream output.
- Terrain LOS, real surface illumination, permanent shadow, ice, slope, traversability and communication link availability remain unavailable. No flat-horizon result establishes them.
- Solar orbits use approximate reference periods but arbitrary phases, circular coplanar guides, compressed distances and visual body scaling. The scene is an educational schematic.
- Test fixtures exist only in tests and are labeled contracts. They are not deployed telemetry fallbacks.

## 7. Environment variables and external dependencies

Node 24.22.1, npm 11.9.0 and system Chromium were used. Vite's pinned lockfile resolved Vite 8.3.4. `.nvmrc` selects Node 24.

Optional `.env` / deployment settings:

- `H89_AI_API_KEY`: server-only OpenAI key; unset in this task. Supply securely, not in chat or frontend code.
- `H89_AI_MODEL`: default `gpt-4.1-mini`; account must have model access.
- `PORT`: default 3001; `HOST`: default 127.0.0.1.
- `NODE_USE_ENV_PROXY`: enabled by provided Node startup scripts to use inherited proxy/CA configuration.
- `CHROMIUM_PATH`: optional browser-test executable override. Otherwise system Chromium is used when present, or Playwright's installed browser.

Runtime remote destinations: `ssd.jpl.nasa.gov` and, for AI, `api.openai.com`. npm installation uses `registry.npmjs.org`. The Moon image and all fonts are local at runtime. No new secret values were requested or fabricated. Existing environment binding names/status were inspected without exposing values. No environment draft/network changes or publication occurred.

## 8. Exact setup and run commands

From the existing checkout:

```sh
cd /workspace/horizon-89
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

The combined dev command handles initial backend compilation, TypeScript watch, API restart and Vite. Use Ctrl-C to stop it. No key is necessary for local catalog/globe/science/atlas functionality.

Production:

```sh
cd /workspace/horizon-89
npm ci
npm run build
HOST=0.0.0.0 PORT=3001 npm start
```

Optional AI configuration: create a local ignored `.env` based on `.env.example` and securely supply `H89_AI_API_KEY`; restart the server. The key must be valid for the configured model and endpoint. No copied placeholder will make generation work.

For development-only frontend/API separation, use `npm run dev:web` and a separately compiled/watched backend. The combined command is recommended to avoid stale server output. If changing `PORT` for development, also configure the Vite proxy target; its supported default is 3001.

## 9. Executed checks and actual results

| Check                                                    | Actual outcome                                                                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm ci --cache /workspace/.npm --no-audit --no-fund`    | Passed; locked installation executed                                                                                |
| `npm run lint`                                           | Passed; zero warnings/errors on final application                                                                   |
| `npm run build`                                          | Passed; frontend TS, production Vite bundle, strict server TS                                                       |
| `npm test`                                               | 14 tests passed, 0 failed/skipped/cancelled                                                                         |
| `npm run test:browser`                                   | 4 Chromium workflows passed, 0 failed/skipped                                                                       |
| `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` | Frontend/API/compiler watches started; zero compiler errors; transformed entry and proxied health request succeeded |
| Production `npm start`                                   | Started and exercised through real HTTP and browser workflows                                                       |
| `git diff --check`                                       | Passed                                                                                                              |
| Texture metadata/hash/HTTP MIME                          | JPEG, expected dimensions/hash, served as `image/jpeg`; missing static image returns 404, not SPA HTML              |
| Direct JPL / NASA network probes                         | Proxy CONNECT denied with HTTP 403; live service/source verification blocked                                        |
| Real AI provider generation                              | Not run; no server key configured                                                                                   |

The build retains Vite’s warning for the large shared lazy Three.js/R3F chunk (roughly 926 KB minified / 246 KB gzip); it was not suppressed. The initial application JS is roughly 262 KB minified / 82 KB gzip, and heavy 3D code is separate. These are bundle measurements, not an FPS guarantee.

Tests cover geographic axis/longitude mapping, radius preservation, invalid/nonfinite coordinates, leap-day/UTC/calendar handling, playback bounds, provenance records, input/date validation, parser columns and unavailable values, Moon observer request construction, upstream failures, body/content-type/origin limits, health/static serving, missing keys, cache/deduplication and mocked AI context transport. Successful remote contract tests use controlled fixtures and do not prove live JPL accuracy or live AI service availability.

## 10. Browser and visual verification

Production frontend and actual landing screen were tested in headless system Chromium with software WebGL. A separate browser smoke checked the Vite development entry. Captures were inspected visually; surface detail is present in the actual mission-control globe, and the atlas contains the selectable planets and rings.

Four automated workflows verify:

1. Desktop 1440×1000: landing screen, canvas size, nonblack output, texture detail reaching GPU pixels (not just image-loader success), grid, camera reset/focus, rotation/zoom interactions, surface selection, mission search/provider filter, manual coordinates, playback/scrubbing, science filtering, comparison/selection, missing-key Copilot, atlas selection/play/pause/reset and return navigation. No uncaught application exceptions or unexpected failing static resources.
2. Mobile 390×844: primary navigation, no horizontal overflow, visible manual controls, quality selection, command-search navigation, actual Moon, deliberate texture failure, visible fallback sphere and successful reload after restoring asset access.
3. Controlled telemetry contract: source/value rendering, wrong-observer rejection with stale values removed, day-complete state and playback restart. This is not real telemetry.
4. Tablet 768×1024: no horizontal overflow, deliberate WebGL context loss, visible failure status and successful viewer reload.

During implementation these checks found a production root-path 404 and an image-loaded-but-untextured material problem. Both were fixed, regression checks strengthened, and affected suites rerun successfully. Console/network inspection found only expected unavailable-service failures in normal offline operation; the explicit missing-image test intentionally aborts that request. No unexpected static 404s remained.

Artifacts: `docs/landing.png`, `docs/mission-control.png`, `docs/mobile.png`, `docs/solar-system.png`. These are actual captures. Physical Intel MacBook GPU performance, Safari, a real touch device and public deployment were not tested. Touch controls come from OrbitControls; viewport testing alone is not a physical touch-hardware validation.

## 11. Feature checklist

| Capability                                                     | State                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Default polished mission control + visible textured Moon       | Complete and browser verified                                            |
| Globe manipulation, target selection, grid and camera controls | Complete; mouse interactions verified; physical touch untested           |
| Historical CLPS search, filtering, details and comparison      | Complete for three curated records                                       |
| Exact verified mission landing markers                         | Partial: withheld until verified coordinates are imported                |
| Manual 89°S study target                                       | Complete                                                                 |
| UTC timeline and historical event date selection               | Complete; exact event times are not invented                             |
| Remote Sun/Earth geometry integration                          | Implemented and contract/error tested; live JPL verification blocked     |
| Terrain/PSR/elevation/slope/ice analysis                       | Unavailable; clearly shown in interface                                  |
| Real server AI integration                                     | Implemented and mock-transport tested; live generation needs key/network |
| Schematic Solar System                                         | Complete and browser verified; no real-time orbital accuracy claimed     |
| Mobile/tablet layout and rendering recovery                    | Browser verified                                                         |
| README, demo, project description and handoff                  | Complete                                                                 |
| Public deployment / environment publication                    | Not performed                                                            |

## 12. Known limitations and bugs

No known critical local rendering, build, navigation or test failures remain in the verified workflow. This is not a claim that all requested scientific capabilities are complete.

- Upstream JPL numerical output has not been validated live in this environment. Parser/convention behavior must be checked against a real response before using the figures for scientific decisions.
- NASA source pages were inaccessible here; links and historical transcriptions need an accessible-network editorial recheck.
- AI answer quality and provider authentication/model access are unverified without a key. The missing-key state is deliberately visible; the demo cannot currently show a real generated answer.
- No verified exact mission-coordinate dataset; mission camera focus is disabled when coordinates are unknown. Destination descriptions and history remain usable.
- Image registration is qualitative, and 1024×512 imagery cannot resolve south-pole local terrain. It is not an LRO/LOLA data product assertion.
- No terrain analysis, local shadow simulation, validated landing comparison metrics, radio link budget or live mission-event feed.
- Browser tests used software WebGL and selected viewport sizes, not physical Intel integrated graphics or Safari. No measured hardware FPS guarantee.
- Rate limits and caches are process-local; development orchestration is intended for local work. Internet deployment needs suitable HTTPS/access controls and durable provider quotas.
- Vite still warns about the shared 3D bundle size. Modules are lazy, but further bundle/asset optimization is possible.

## 13. Concrete blockers and unavailable datasets

External prerequisites, not hidden coding steps:

1. Permit HTTPS to `ssd.jpl.nasa.gov` and independently compare a returned observer solution with the JPL web/API reference. This task intentionally did not edit environment settings.
2. Supply a valid server-only `H89_AI_API_KEY`, permit `api.openai.com`, and verify one real model answer, source references and follow-up context.
3. Import a documented, independently verified as-landed-coordinate source (coordinate system, units, epoch/source and precision included).
4. Supply georeferenced LOLA or another trusted DEM plus validated PSR/illumination products before implementing terrain, slope or shadow analytics.

No useful independent implementation work is left blocked on an unanswered preference. Local exploration and offline failure behavior are operational; full live science and AI claims remain explicitly incomplete.

## 14. Recommended next steps

Prioritize live JPL cross-checking and a configured AI smoke test, then ingest verified mission coordinates and expand the catalog with independent editorial review. Next add a proper georeferenced terrain pipeline with dataset attribution/versioning and tested coordinate transforms. Validate on the target Intel MacBook and Safari, measure real render/frame/memory behavior, and consider smaller Drei imports or further 3D chunk splitting. Add deployment-specific authentication, quotas and durable cache/rate limiting before public multi-user service.

## 15. Demo and project description

[docs/DEMO.md](docs/DEMO.md) contains the complete 60–90 second flow, including the honest alternative when AI/JPL are unavailable. [docs/PROJECT.md](docs/PROJECT.md) explains the problem, solution, distinctive scientific integrity, architecture and future potential. README documents exact installation/development/production commands and all environment requirements.

The product is demonstrable for local lunar/mission/science/atlas exploration now. Present remote AI and ephemerides as integrations awaiting their documented prerequisites, not as verified live capabilities.
