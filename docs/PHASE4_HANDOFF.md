# HORIZON 89 — Phase 4 handoff

Version `0.4.0-rc.1` · 2026-11-09 · existing branch `feat/horizon89-mission-platform` · baseline `cc98050`.

## Implementation

The default opening screen is now a full-viewport interactive Solar System. The Sun, all eight planets and the Earth-relative Moon are selectable, with orbital guides, a restrained decorative starfield, point-source lighting, stylized atmosphere rims and Saturn ring geometry. Source maps are natural where appropriate; Venus's false-color surface map is explicitly opt-in. Distances, sizes, circular orbits, phases, illumination and the day counter remain schematic—not true scale, live positions, astrometric stars or scientific trajectory calculations.

Moon selection highlights it and starts an eased 1.8-second camera approach. A progress/cancel state leads into the **existing** lunar Mission Control without a full reload. Reduced-motion preference uses an immediate transition. The Back to Solar System action restores selected Solar object, schematic day and camera-follow preference; lunar site, mission, timeline and quality state are preserved. Direct primary navigation to Mission Control remains available. Reset/reselection issue a new focus request even when the same object was already selected. Low/balanced/high graphics controls are available in the opening scene; free-camera/follow modes remain.

The existing lunar catalog, manual coordinates, study/verified marker distinctions, comparisons, source/uncertainty panels, terrain import architecture, UTC controls, Copilot, mobile navigation, WebGL fallback and image-reload controls are preserved. Old lunar workflow tests now explicitly navigate from the new entry screen instead of assuming it remains the default.

## Actual imagery obtained and verified

Six NASA visualization maps were downloaded from accessible **official public NASA GitHub repositories**, inspected and encoded for local use:

| Object  | Source identity                                               | Original dimensions | Display interpretation                                                               |
| ------- | ------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Earth   | NASA WorldWind `BMNG_world.topo.bathy.200405.3.2048x1024.jpg` | 2048×1024           | Historical Blue Marble composite with topography/bathymetry; not live clouds/weather |
| Mars    | NASA 3D Resources `Images and Textures/Mars/Mars.jpg`         | 1440×720            | Qualitative visualization map; original instrument/acquisition metadata absent       |
| Jupiter | NASA 3D Resources `Images and Textures/Jupiter/Jupiter.jpg`   | 720×360             | Historical atmospheric visualization; not live weather                               |
| Saturn  | NASA 3D Resources `Images and Textures/Saturn/Saturn.jpg`     | 720×360             | Historical atmospheric visualization; rings are display geometry                     |
| Neptune | NASA 3D Resources `Images and Textures/Neptune/Neptune.jpg`   | 720×360             | Historical atmospheric visualization; no live atmospheric claim                      |
| Venus   | NASA 3D Resources `Images and Textures/Venus/Venus.jpg`       | 1440×720            | **False-color surface visualization, off by default**, not natural visible clouds    |

NASA 3D Resources was pinned to `11ebb4ee043715aefbba6aeec8a61746fad67fa7`; NASA WorldWind to `2543c234349c76f4a290e318b49f071ac156d2a0`. Exact source/download URLs, asset identifiers, source/display SHA-256, retrieval dates, dimensions, interpretation, usage notes and conversion method are in [the served manifest](../public/textures/planets/provenance.json). No AI-generated map or random procedural planetary surface is used.

The NASA collection README declares assets free/without copyright and links NASA usage guidelines; its repository metadata names NOSA 1.3. Both source records are preserved. The WorldWind Apache 2.0 license PDF is included. NASA media/branding constraints and no-endorsement language remain. Original imaging/calibration/registration metadata is incomplete, so these are **source-attributed display assets**, not certified scientific measurements. The original Earth (A) relief map and Earth (B) disk photograph were inspected and rejected as the natural spherical Earth texture; the WorldWind Blue Marble asset is used instead.

Conversion: locked Sharp, maximum width 2048, JPEG quality 90, no synthetic features, brightness-to-height transform, contrast-based crater fabrication or displacement. `npm run imagery:prepare` was actually executed: it fetched the pinned sources, verified all six source hashes, reproduced conversion output and verified all six display hashes. Raw files and temporary source checkouts remained outside Git; only small converted JPEGs and provenance/licensing records are included.

**Missing imagery:** no reviewed Sun, Mercury or Uranus map or separate cloud map was acquired. Those objects use plainly labeled emissive/solid fallback materials; Venus defaults to a plain natural cloud-colored shell with no invented cloud pattern. Atmospheric rims and stars are stylized graphics, not observations. Full authoritative texture coverage is therefore partial, not falsely declared complete.

## Requested LROC product

Requested URL: `https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P`.

The actual page could not be reached: proxy CONNECT HTTP 403. **No actual LROC TIFF/IMG, label, publisher checksum, projection metadata or higher-resolution source was retrieved.** No screenshot/thumbnail was substituted. The existing Moon map remains visibly labeled legacy qualitative imagery; the requested LROC replacement is unavailable until a reviewed import.

Delivered [exact manual instructions](science/LROC-IMAGERY.md), review template and `science:import-moon`. The importer reads real TIFF IFD/GeoTIFF metadata and Sharp decoder dimensions, validates 2880×1440 / 8-bit / 8 px-degree / north-up / PixelIsArea / explicit angular degrees / user-defined lunar CRS, rejects Earth or unsupported registration, verifies supplied publisher SHA-256 and records original/display hashes, source, datum, retrieval time, processing date and conversion method. It produces a local JPEG and manifest; `/api/imagery` checks the manifest and display hash before enabling that map in **both** Solar Moon and Mission Control. Review-only arbitrary fields are not copied into public metadata.

Supported input is a strict prepared geographic classic GeoTIFF subset. Other TIFF projections/bit depths, BigTIFF, unregistered images and IMG require a separately documented geospatial conversion from reviewed actual source metadata; there is no universal silent converter. The original label and raw file should remain in ignored `.data/lroc/`. Registration must be independently checked at the seam, prime meridian, hemispheres and poles. Nominal raster extent is not proof of valid coverage; blanks are not evidence of shadow. No no-data repair or inpainting is implemented.

A synthetic registered TIFF fixture in a temporary test directory exercises the actual importer and checksum failure path. **This is not validation against the inaccessible LROC product.** At eight pixels/degree it is global context imagery, not close-up terrain detail or elevation. No higher-resolution LROC product was imported or claimed registered.

## Horizons investigation and recovery

The previous parser recognized only `Azi_(a-app)` / `Elev_(a-app)`. Inspection of Astroquery's maintained JPL Horizons column mappings identified the recognized long alternatives `Azimuth_(a-app)` / `Elevation_(a-app)` as well. The parser now accepts both strict airless forms, rejects duplicate/ambiguous or refracted columns, retains exact returned-time checks, numeric bounds and units, and distinguishes unsupported output from missing observer tables, upstream HTTP/error JSON, bad JSON, network errors and timeouts. API errors now carry a diagnostic `code`; no fake geometry is substituted.

Reference inspected: `https://github.com/astropy/astroquery/blob/main/astroquery/jplhorizons/__init__.py`, column mapping for airless/refracted AZ/EL. This is a client compatibility reference, not an independent live JPL validation. Official JPL documentation access was also blocked here.

The reported browser 502 cannot be fully root-caused against its actual upstream body in this environment. The alias mismatch is a concrete parser compatibility defect fixed and fixture-tested; **it is not proof that every previously observed 502 is resolved**. The actual environment returns `/api/horizons` HTTP 503 with `code=NETWORK_ERROR` because the proxy blocks JPL. The quantity-4 lunar observer request remains explicit; no unrelated RA/Dec or refracted values are reinterpreted as airless geometry.

The eight-case runner was executed again: **0/8 upstream observer requests retrieved**, exit 1. [The Phase 4 report](science/horizons-phase4-report.json) retains exact queries and failed status. Requests cover Sun/Earth, 89°S at midnight/noon, equator/leap day and a second polar site. Official web/batch numerical comparison, frame/model confirmation and actual hosted-Codespaces upstream access remain unverified. Previous [validation protocol](science/HORIZONS-VALIDATION.md) still applies.

Fresh direct probes to the LROC product, JPL API/docs, NASA SVS texture catalog, NASA CLPS, USGS and the candidate texture catalog were all CONNECT-denied. Official mission source links were audited but could not be re-fetched. The historical mission catalog stays explicitly historical; no new mission status, landing coordinate, terrain, PSR or illumination measurement is invented.

## AI Copilot

The existing server-only `H89_AI_API_KEY` and unchanged `H89_AI_MODEL` default `gpt-4.1-mini` remain. No key was present in bindings/process/local `.env`, and no key or real provider response was fabricated.

The system prompt explicitly separates sourced facts, calculations, assumptions and unavailable information. Context includes selected mission/comparison, analyst coordinate, UTC, matching sourced geometry only when present, terrain availability/provenance/sample, current lunar-imagery status and Solar object. Image maps are not measurements. A model may not claim a live fetch merely because an integration exists.

Delivered [Codespaces secret instructions](AI_SETUP.md), `npm run test:ai:live` and a conditional real-response browser workflow. The CLI was executed and **explicitly skipped without a key**; it made no provider request. The browser real-response case also skipped based on backend configuration. With a real configured key, those workflows submit real UI/backend requests and fail on provider/transport/empty-answer errors. They never supply a placeholder key or scripted answer. Existing mock-transport unit tests remain labeled contracts. Loading, timeout, provider error and missing-key states remain.

## Verification actually executed

| Check                                                           | Outcome                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `npm ci --cache /workspace/.npm --no-audit --no-fund`           | Passed, 108 locked packages installed                               |
| `npm run lint`                                                  | Passed without warnings/errors                                      |
| `npm run build`                                                 | Passed frontend TypeScript, Vite and strict backend build           |
| `npm test`                                                      | 38 passed; zero failed/skipped/cancelled                            |
| `npm run test:browser`                                          | 9 passed, 1 explicitly skipped (real AI key absent), zero failures  |
| `npm run imagery:prepare`                                       | Six NASA source hashes and six reproduced display hashes verified   |
| `npm run test:ai:live`                                          | SKIPPED: no configured key; no real response claimed                |
| `npm run science:verify-horizons -- .data/horizons-phase4`      | Blocked/failed: 0/8 retrieved, exit 1                               |
| Actual `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` | Started compiler/API/Vite; browser exercised actual development URL |
| Development API `/api/imagery`                                  | Explicit LROC-unavailable inventory and labeled legacy image        |
| Development `/api/horizons`                                     | HTTP 503 NETWORK_ERROR; no fallback values                          |
| Secret/artifact scans and `git diff --check`                    | Passed; staged result recorded at delivery                          |

Browser coverage: new Solar opening; natural/false-color/missing source selection; texture failure; high/low graphics controls; Moon highlight/progress/fly-in; Mission Control arrival; no navigation reload; preserved UTC on round trip; Back to Solar System; reset/follow/free camera; reduced motion and mobile; genuine Moon texture rendering; existing catalog, coordinate, comparison, terrain availability/import, timeline, missing-key Copilot, WebGL/texture fallback and return navigation.

The TIFF fixture initially had unsorted directory tags; the fixture was corrected to valid TIFF ordering rather than weakening Sharp verification. Build/lint/test failures encountered during implementation were corrected and the relevant complete suites rerun. No final failure was hidden or converted to a fabricated scientific success.

## Preview, visual review and compatibility

The actual managed-cloud Vite development preview was used in Chromium, not just a static screenshot: the Solar scene loaded, NASA textures loaded, Moon selection reached Mission Control, and no uncaught application exceptions were observed. New desktop/mobile captures were visually inspected. The existing production browser suite also ran against the built app/API.

This executor is a managed cloud workspace, **not a provisioned GitHub Codespace** (`CODESPACE_NAME` absent). A genuine GitHub-hosted preview and upstream JPL request from such a Codespace were not available, so no claim of that verification is made. The existing Codespaces host-preserving proxy and private-port instructions remain; the exact command is tested locally in this environment. No public deployment, new application/repository/branch, reset or force push was performed.

Assets are local and bounded (max 2048-wide planets; optional WAC display 2880×1440), geometry is modest, default DPR capped at 1.25, low-power DPR 1, high DPR 1.5. High mode enables bounded 512 shadow maps; the emitting Sun does not cast an occluding shadow around its own point light. No bloom/post-processing dependency was added. Default star count is 1,200, low 550, high 2,200; they are decorative, not catalog observations. On-demand rendering and manual texture/geometry disposal remain. Frame-rate/physical Intel MacBook/Safari/touch hardware measurements were not performed. Vite still warns about the ~926 KB shared lazy 3D chunk; this warning is not suppressed.

## Run and reproduce

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

In Codespaces use Node 24 and **Ports → 5173 → Open in Browser**, keeping the port private; backend 3001 remains internal behind Vite. Publishing/restarting an environment does not preserve a running dev process. A browser's local `localhost` is not automatically the cloud workspace: use the workspace browser or proper forwarding.

```sh
npm run build
npm start
npm run imagery:prepare
npm run test:ai:live
```

No key is required for the local explorer and lunar workflows. Real AI needs secure `H89_AI_API_KEY`, model access and HTTPS to `api.openai.com`. Real geometry needs permitted `ssd.jpl.nasa.gov`. The requested WAC needs permitted `data.lroc.im-ldi.com` or the documented manual import. No network/security setting, checksum expectation or TLS verification was weakened.

## Changed files

Core: `src/App.tsx`, `src/components/{SolarExplorer,MoonViewer,LunarImagery}.tsx`, `src/data/planetImagery.ts`, `src/lib/solar.ts`, `src/science/geotiff.ts`, `src/styles/theme.css`, `server/{horizons,index,imagery}.ts`.

Assets/tools: `public/textures/planets/` maps and provenance/licensing, `scripts/science/{prepare-planet-textures.mjs,import-moon.ts}`, `scripts/test-ai-live.mjs`, package version/scripts/lockfile, `.gitignore` for generated LROC output. No runtime dependency was added.

Tests/docs: new Phase 4 unit/browser tests; adapted prior lunar browser entry steps and version assertion; Phase 4 screenshots, README/current handoff links, AI setup, LROC review/import guide, fresh failed-JPL report and this handoff. Prior Phase 3 capture is retained as historical; Phase 4 captures document the new entry and retained lunar scene.

## Completed / partial / unavailable

- **Complete and tested:** Solar-first entry, all eight planets plus Sun/Moon, camera/orbit/selection controls, six source-attributed NASA maps with false-color distinction, Moon fly-in and no-reload lunar arrival, preserved mission/science/terrain/timeline/atlas behavior, graphics/fallback/mobile/reduced-motion states, parser alias recovery and diagnostic errors, optional real-AI workflows.
- **Partial:** full authoritative planetary texture coverage; source visualization maps have incomplete original acquisition metadata. Sun/Mercury/Uranus and cloud maps remain labeled untextured. A hosted Codespaces preview is unverified.
- **Unavailable/unverified:** requested LROC product and high-resolution registered close-ups, independent live JPL results, real AI answer without key, real terrain/PSR/illumination, exact newly verified mission coordinates and physical target-hardware performance. No substitute values or surface data are fabricated.

## Git delivery

Implementation commit **`37bb38a`** was committed and successfully pushed to `origin/feat/horizon89-mission-platform` after the final checks. Staged secret/artifact scan passed for 34 text files and `git diff --cached --check` passed. A redundant observer-table guard was removed during final review; lint and all 38 unit/API tests passed again afterward. This documentation-only delivery record follows the implementation commit. No public deployment or environment publication was performed.
