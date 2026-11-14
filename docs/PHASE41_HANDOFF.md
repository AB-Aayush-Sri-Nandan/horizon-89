# HORIZON 89 — Phase 4.1 handoff

2026-11-10 · branch `feat/horizon89-mission-platform` · baseline `ee2671b`.

## Implemented

- A distinct default homepage with the exact “Beyond Earth. Into the Unknown.” headline, HORIZON 89 branding, crimson/cyan/cool-white identity, responsive typography and restrained entrance animation. Explore Universe opens the existing Solar scene; Discover Lunar Missions opens existing Lunar Mission Control. Home navigation/brand returns to the homepage without a reload. Copilot remains available in exploration/workspace screens rather than overlaying the landing image credit.
- A locally bundled NASA Tycho Star Map behind the homepage and Solar scene, with visible source links. The homepage has a layered gradient and CSS star fallback if the image fails; Solar retains its decorative R3F starfield and gradient. This is a NASA-hosted catalog visualization, **not a telescope photograph, a live sky view or a simulated nebula**.
- Continuous delta-time planetary revolution and surface rotation while Play orbits is active. Three objects mutate via refs, not React state every frame. Schematic day/camera snapshots update no more than four times per second. Pause orbits pauses both revolution and illustrative rotation. Surface spin rates are visual choices, including retrograde illustration for Venus/Uranus, not physical orientation models.
- Delta-time eased selection/Moon flights, exponential time-based OrbitControls damping and follow translation rather than repeatedly restarting flights on day ticks. Camera position/target, selected body, day, tracking and Venus false-color choice survive in-app navigation. Playback returns paused. Session state is in memory, not persisted through reload.
- Reduced-motion preference is observed live: animation playback is disabled and camera selection resolves immediately on the next frame. Hidden tabs suspend the Canvas frameloop and stop requesting animation; resume clamps a stalled frame to 100 ms to avoid a leap. Low power requests motion at 30 Hz; balanced/high request up to about 60 Hz. Idle scenes stop the animation-request timer and retain demand rendering. No target-hardware FPS or power consumption benchmark is claimed.
- An optional Mercury GLB loading path, with fallback, bounded local server delivery and resource disposal. No new project dependency or lockfile change.

Existing lunar catalog/comparison, manual targets, UTC playback, scientific uncertainty, terrain import, Horizons, source panels, Moon controls, responsive navigation, WebGL recovery and server-only Copilot remain. The six prior NASA maps and their manifest hashes remain unchanged. No scientific values, coordinates or live responses were fabricated. AI remains unconfigured without a key; no key was requested.

## Background asset and source

- `public/images/tycho-starfield.jpg`: 2560 × 1280 JPEG, 719,406 bytes.
- NASA 3D Resources, `Images and Textures/Tycho Star Map/Tycho Star Map.jpg`, pinned revision `11ebb4ee043715aefbba6aeec8a61746fad67fa7`.
- Exact URL, source/display SHA-256, retrieval timestamp, dimensions, conversion and interpretation: [space-provenance.json](../public/images/space-provenance.json).
- Original image: 2880 × 1440. Sharp resized to width 2560, JPEG quality 88. CSS crops/dims it; no image features were generated. Existing NASA collection usage notes/media guidelines and no-endorsement terms apply; linked in the manifest.
- Reproduction: `NODE_USE_ENV_PROXY=1 node scripts/science/prepare-space-background.mjs`. The runner verifies both pinned source and output hashes and refuses mismatches. The initial NASA Image Library destination returned 403; the official NASA GitHub source was accessible.

## Mercury: partial, actual source model unavailable

The user corrected the source name to **`Mercury_1_4878 (1).glb`**. Searches throughout `/workspace` found neither that file nor another Mercury GLB. `.data/manual-assets/` was absent. No raw model was copied into `public/` or added to Git. No claim is made that the actual model was inspected, optimized, aligned, licensed or visually validated.

The implementation is ready to load either the corrected name or `Mercury_1_4878.glb` from ignored `.data/manual-assets/`, preferring the corrected name. `/api/models/mercury` reports availability without generating a missing-resource error; `/api/models/mercury.glb` serves only the recognized self-contained local GLB. The server checks the GLB 2.0 header/declared length/JSON chunk, rejects external image/buffer references, required extensions needing unconfigured decoders, symlinks escaping the directory and files over 32 MiB. It never exposes arbitrary paths. The directory remains outside the static root.

The existing Three.js GLTFLoader parses geometry/materials. The loader preserves authored orientation and materials, centers its bounding box and fits the largest dimension to the schematic Mercury diameter. A parent transform handles revolution and illustrative Y-axis spin; planet selection works through the parent group. Load/parse/degenerate-bound failures keep the original plain sphere. Geometry, materials and textures are disposed on unmount. No unsupported compression decoder or new runtime dependency was added.

A synthetic sphere GLB browser fixture exercised parsing, scale normalization, selection, motion and failure fallback. It is test-only and is not Mercury imagery or evidence about the user's model. **Next step:** place the actual file at `.data/manual-assets/Mercury_1_4878 (1).glb`, reopen Solar System, inspect its bounds/mesh counts/materials/axes and provenance, and validate real appearance/lighting/performance. Those asset-specific tasks remain outstanding.

## Files changed

- UI/navigation: `src/App.tsx`, new `src/components/Home.tsx`, `src/components/SolarExplorer.tsx`, new `src/components/MercuryModel.tsx`, `src/lib/solar.ts`, `src/styles/theme.css`.
- Server: `server/index.ts`, new `server/mercury.ts`.
- Assets/tools: `public/images/tycho-starfield.jpg`, `public/images/space-provenance.json`, `scripts/science/prepare-space-background.mjs`.
- Tests: `tests/phase41.test.ts`, `tests/browser/phase41.spec.ts`, adapted homepage entry in `tests/browser/phase4.spec.ts`. Existing browser screenshots now write to ignored `test-results/` rather than overwriting historical documentation captures (`release`, `science`, `workflows`, `phase4` suites).
- Documentation: `README.md`, this report, `docs/phase41-home.png`, `docs/phase41-mobile-fallback.png`, `docs/phase41-solar.png`.

## Validation

Final results are recorded below after running the current implementation. A synthetic provider/model fixture is always distinguished from a real remote scientific response or the missing user GLB.

| Check | Actual result |
| --- | --- |
| `npm run lint` | Passed, no warnings/errors |
| `npm run build` | Passed frontend TypeScript, Vite and backend TypeScript; existing 926 KB shared 3D chunk warning remains |
| `npm test` | 40 passed, 0 failed/skipped/cancelled |
| `npm run test:browser` | 12 passed, 0 failed, 1 explicitly skipped: real AI key absent |
| `NODE_USE_ENV_PROXY=1 node scripts/science/prepare-space-background.mjs` | Passed: pinned NASA source hash and reproduced JPEG hash verified |
| `npm run check:secrets` | Passed working-tree credential/raw-artifact pattern scan |
| `git diff --check` | Passed |
| Actual combined dev command | Started Vite, API and TypeScript watcher; watcher reported 0 errors |
| Chromium against actual dev port 5173 | Home → Solar → Earth NASA map → Moon → Mission Control → Solar; zero uncaught page errors; health OK and Copilot unconfigured |
| Mercury inventory in actual dev server | `available: false`; no actual model was available to validate |
| Narrow homepage at 320 px | No horizontal overflow |

The browser suite covers homepage first entry and both CTAs, actual local image dimensions, reduced motion, intentionally failed homepage/planet imagery, WebGL fallback, Earth/Mercury/Venus selection, false-color opt-in, Moon progress and repeated round trips, preserved lunar UTC and Solar selection/day, synthetic GLB success/parse failure, hidden-tab event pause/resume, mobile/tablet layout, existing mission/science/terrain/AI-unconfigured workflows and WebGL context-loss recovery. Hidden-tab handling was exercised by dispatching a visibility-change event with `document.hidden` overridden; this is a browser contract check, not an OS power benchmark. Expected fallback failures are deliberate test cases; no unexpected image errors or uncaught page exceptions occurred in the normal homepage/navigation check.

An initial run failed on repeat Moon entry; the transition/restoration logic and stalled-frame clamp were corrected, and the full suite above passed afterward. Earlier lint ref/dependency warnings were resolved. Tests do not weaken assertions or pretend a real Mercury asset was loaded. Real AI remains skipped. Live Horizons, LROC, scientific terrain and mission-coordinate availability remain as documented in prior phases; no new live scientific validation was attempted or claimed.

Current screenshots were visually inspected: [homepage](phase41-home.png), [Solar scene with Earth selected](phase41-solar.png), [mobile image-failure fallback](phase41-mobile-fallback.png). Historical Phase 2–4 screenshots were preserved rather than replaced by routine test runs.

## Run commands

Node 24 and the existing checkout are required. The selected branch needed its locked Playwright test dependency, which was absent from the original main-branch installation; `npm ci --cache /workspace/.npm-cache --no-audit --no-fund` installed the selected branch's frozen lockfile. No dependency declaration or lockfile was changed.

```sh
cd /workspace/horizon-89
# Only if dependencies are absent or the lockfile changed:
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

This runs the API on 3001 behind Vite 5173, compiles/watches server TypeScript and watches frontend source. Stop a separately running API/Vite first. The combined stack was left running after the final dev smoke check. Ctrl-C terminates its children. It must be restarted after a new environment/session restores the filesystem.

```sh
npm run lint
npm test
npm run build
npm run test:browser
npm run check:secrets
# Or production from the built checkout:
npm start
```

For hosted Codespaces use the existing private 5173 forwarding instructions in README. No hosted Codespace or physical Safari/mobile-GPU validation was performed. No commit, push, merge, deployment or environment publication was performed. Changes are uncommitted for user review.
