# HORIZON 89 — Phase 3 release candidate

Release: `0.3.0-rc.1`. Work date: 2026-11-08. Branch: `feat/horizon89-mission-platform`.

## 1. Audit and preservation

Inspected the current branch/status, README, combined Phase 1/2 HANDOFF, manifests/lockfile, backend, UI components, terrain parser/import scripts, provenance model, existing tests and runtime policy. No AGENTS.md was present. The complete prior application remained as uncommitted work relative to `f7a10e7`; it was preserved and is included in the release commit, rather than discarded or rewritten. A pre-change source backup exists outside the repository at `/workspace/horizon89-phase3-baseline.tgz`. No duplicate app, branch reset, force push, public deployment or production/environment settings change occurred.

## 2. Implemented and improved

- Added a scientific-readiness strip separating bundled imagery, DEM inventory, remote ephemeris requirements and server AI configuration. Configuration is explicitly not upstream verification.
- Preserved the natural, textured Moon and added keyboard-accessible zoom buttons, more compact camera controls, study/verified marker distinctions and explicit manual-target feedback. Study coordinates remain unsurveyed and distinct from actual landing records.
- Preserved historical CLPS records, search/filter/detail/event workflows, UTC playback, science panels, comparison and Solar System navigation. Mission provenance now exposes missing reference frame, datum/radius, access date, uncertainty and verification status instead of implying these were known.
- Strengthened as-landed record gating: source access/publication/review dates must be valid calendar dates; reference frame/datum must be present; radius, if supplied, must be lunar; credential-bearing source URLs are rejected. No new landing coordinate was invented.
- Added an atlas follow/free-camera toggle so animation no longer forces camera tracking when the user wants to explore freely. Schematic/non-scale/non-live labels remain.
- Added an in-app manual DEM import guide with supported-format boundaries, Codespaces upload steps, source review, command copying and explicit limitations.
- Added `science:inspect`, which checks labels, raster size, explicit geospatial metadata, provenance and publisher checksum when present without writing terrain. Retrieval time is now required from the operator’s reviewed record, and conversion time is recorded separately. Credential-bearing URLs, malformed checksum fields and excessive metadata are rejected. Conversion stages output before replacing the visible tile; rejected processing does not truncate an existing tile.
- Tightened runtime terrain reference/integrity validation. Existing nearest-sample/elevation/slope provenance and unavailable metrics remain; no suitability score, PSR, ice or communication claims were added.
- Fixed development proxy host rewriting that could reject same-origin Copilot POSTs through Codespaces HTTPS forwarding. Only the current Codespaces hostname is conditionally allowed; no blanket Vite host allowance or trust of arbitrary forwarded-origin headers was introduced.
- Hardened malformed API contexts/origins/paths, hidden-file/static-symlink access, provider timeout messages, provider answer type checks, production asset caching and nosniff/referrer headers. API keys remain server-only.
- Restored keyboard focus after command search closes. On small screens the Copilot launcher is compact in the header so it does not cover selected lunar coordinates.
- Added a working-tree/staged secret and artifact scanner that reports filenames only, not suspected values. No new runtime/development dependency was required.

## 3. Scientific datasets actually obtained

**No new authoritative scientific dataset or coordinate record was obtained.** There is no real LOLA DEM, PSR/illumination mask or newly verified landing coordinate in the shipped application. The bundled qualitative lunar JPEG remains the earlier Three.js example asset with its recorded hash/license and acquisition/registration limitations.

A fresh JPL request again failed at proxy CONNECT with HTTP 403. Runtime policy remains restricted, with no custom host additions. The server AI key is absent and no live AI response was attempted. No key was invented, printed or requested in chat. Existing unit mocks are transport contracts, not real service validation.

The import pipeline is validated with explicit synthetic mathematical/binary fixtures in tests only. It has **not** been validated against a real authoritative LOLA file. No synthetic observation tile is placed in `public/science/` or substituted at runtime.

## 4. Manual data workflow

Upload the reviewed detached PDS3 label/image and provenance JSON to ignored `.data/lola/` in the Codespaces file explorer. Use [provenance.example.json](science/provenance.example.json), filling actual product identity, authoritative URLs, source retrieval UTC, vertical datum, attribution/license and publisher SHA-256 when available. Placeholders are deliberately invalid.

```sh
npm run science:inspect -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json
npm run science:ingest -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json public/science/terrain.json
npm run build
npm start
```

Successful input inspection does not establish product suitability, calibration, licensing or geographic registration. Independently compare original source pixels/metadata before presenting a real import as validated science. Full supported-subset restrictions, projection equations, no-data/scaling rules, local slope method, bounds and memory budgets are in [INGESTION.md](science/INGESTION.md). Raw downloads and generated science artifacts remain ignored by Git; no browser upload API or raw-raster browser processing was added.

## 5. Verification executed

| Check                                                              | Actual result                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `npm ci --cache /workspace/.npm --no-audit --no-fund`              | Passed; 108 locked packages installed                                            |
| `npm run lint`                                                     | Passed with no warnings/errors                                                   |
| `npm run build`                                                    | Passed frontend TypeScript, Vite production build and strict backend TypeScript  |
| `npm test`                                                         | 32 passed; zero failed/skipped/cancelled                                         |
| `npm run test:browser`                                             | Seven workflows passed after fixing missing target-feedback wiring               |
| Exact combined development command below                           | Started API, server compiler/restart watch and Vite; zero compiler errors        |
| Same-origin POST through Vite                                      | Reached intended missing-key HTTP 503, not origin rejection                      |
| Simulated Codespaces HTTPS hostname/origin through configured Vite | Reached intended missing-key HTTP 503, not 403; no actual hosted Codespace claim |
| `npm run check:secrets` and staged-content scan                    | See delivery section; no credential values are printed                           |
| `git diff --check`                                                 | Passed                                                                           |
| Fresh JPL probe                                                    | Blocked by CONNECT HTTP 403; no live result claimed                              |
| Real AI response / real DEM import                                 | Not run: missing key / no authoritative product                                  |

New tests cover malformed history/comparison/site/object inputs, invalid origins, same-origin POST behavior, hidden/malformed paths, production cache headers, strict landing provenance, inspection without output, retrieval-versus-processing timestamps, checksum rejection and preservation of prior outputs. Existing tests continue to cover scientific transforms, no-data/endian/units/slope, UTC/returned timestamps/cache freshness, API failures, missing keys and real globe GPU texture detail.

Browser verification covers initial dashboard and Moon, mouse rotation/zoom/surface selection, keyboard zoom and command focus, manual targets and feedback, mission information/provenance, terrain availability/import guide, location comparison, timeline, atlas follow/free mode and return navigation, missing AI/data, texture failure and WebGL recovery, plus mobile/tablet layouts. The optional terrain-overlay contract uses a labeled synthetic route fixture, not real science data. Desktop/mobile captures were visually inspected; screenshots are actual app captures, not mockups.

After the small-screen launcher adjustment, `npm run test:browser -- --grep 'mobile navigation|release readiness'` passed both affected workflows (2 passed, 0 failed/skipped). The production build and lint also passed after that adjustment.

## 6. Performance and compatibility

Retained on-demand 3D rendering, low-power preference, modest globe geometry, local 1024×512 texture and default DPR cap 1.25. No new large asset or dependency was added. Terrain remains bounded and lazy in its existing pipeline; no raw scientific raster enters the browser. Production fingerprinted JS/CSS assets now use immutable caching; HTML/science inventory are not treated as immutable.

Vite still reports the shared lazy Three.js/R3F chunk at about 926 KB minified / 246 KB gzip. The warning was not suppressed. Chromium software-WebGL and selected desktop/mobile/tablet viewport behavior were checked. Physical Intel MacBook FPS/memory, Safari, true touch hardware and a real GitHub-hosted Codespace were not tested. The documented dev command and forwarded-host behavior were verified locally, which does not constitute a public deployment.

## 7. Run and preview

Node 24 is required (tested 24.22.1); `.nvmrc` selects it. From the repository:

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

In Codespaces, use `nvm install && nvm use` if needed, then open **Ports → 5173 → Open in Browser**, retaining **Private** visibility. Backend 3001 stays internal behind the Vite proxy. Stop a separately running backend before starting the combined launcher. Optional server values belong in ignored `.env` or secure environment settings, never frontend variables or Git.

```sh
npm run build
npm start
```

This serves the built app/API together on 3001. No key is required for imagery, mission history, coordinates, comparison, timeline or atlas. `H89_AI_API_KEY` and reachable OpenAI access are needed for real answers; `H89_AI_MODEL`, `PORT`, `HOST` and inherited proxy/CA settings retain their documented meanings. Real observer geometry additionally needs JPL access. No production settings were changed.

## 8. Known limitations and release state

| Capability                                                           | State                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Local mission-control/Moon/catalog/timeline/science/comparison/atlas | Implemented and tested                                                    |
| Manual import inspection/conversion and provenance                   | Synthetic-fixture validated; real-product validation still pending        |
| Actual terrain elevations/slopes and exact mission markers           | Unavailable without reviewed authoritative inputs                         |
| Illumination/PSR/roughness/communications/suitability score          | Unavailable; no fake values or score                                      |
| Independent live JPL accuracy                                        | Still blocked/unverified                                                  |
| Real AI generation                                                   | Key absent; unavailable state tested                                      |
| Codespaces preview                                                   | Local command/forwarded-host tests pass; hosted Codespace not provisioned |
| Public deployment                                                    | Not performed                                                             |

Remaining scientific blockers and exact authoritative candidate/verification steps remain in the Phase 2 handoff and `docs/science/`. The decoder still supports only the explicit PDS3 subset. Image registration is qualitative, not certified lunar mapping. Basic rate limiting/cache are process-local; multi-user production operation needs deployment-specific authentication and durable quotas. The credential scanner detects known patterns/artifacts and complements, rather than replaces, human diff review.

## 9. Git delivery

Branch: `feat/horizon89-mission-platform`. Git read authentication succeeded; no branch reset or force push is used. Prior phases were uncommitted, so the release commit necessarily records their preserved implementation together with Phase 3 changes. The implementation commit hash and confirmed push result will be recorded in the delivery update after successful Git operations. No public deployment or environment publication is authorized by this Git delivery.
