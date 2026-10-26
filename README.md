# HORIZON 89 — CLPS Lunar Mission Browser

Existing React 19 / TypeScript / Vite / React Three Fiber frontend. Node 24 and
npm 11 were used for the current baseline. See [repository audit and technical
roadmap](docs/architecture.md) and [Phase One handoff](docs/phase-one-handoff.md).

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run test:science
npm run check:secrets
npm run build
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Browser checks:

```sh
npx playwright install chromium
npm run test:browser
```

On a machine with a supported Chromium already installed:
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser`.
Browser fixtures validate the frontend, not real JPL science. Tests use a second
Vite instance on port 5174. CI also installs Chromium system dependencies.

## Current limitations

The repository does **not** contain the previously reported Express backend or
its approximately 30 tests. `/api` proxies to 127.0.0.1:3001, where a separately
recovered backend must run. API health, real geometry, caching and AI cannot be
claimed operational. Copilot remains UI-only standby. No credentials are needed
for the frontend; never put credentials into `VITE_*` variables.

The genuine LROC source TIFF and generated texture are absent. The scene now
shows an explicitly labelled neutral reference sphere, not fabricated lunar
imagery. Lighting is illustrative, not a science-derived terminator. Current
reference-horizon telemetry is not terrain-corrected visibility or an RF link
budget. Demo charts/timeline remain labelled demonstration UI.

## Genuine Moon asset pipeline

Supply the original `WAC_GLOBAL_E000N0000_008P.TIF` at
`public/textures/source/WAC_GLOBAL_E000N0000_008P.TIF`, verify its product identity,
then run `npm run assets:moon` from the repository root. An explicit source path
may be passed after `--`. The compatibility command `node src/convert-moon.cjs`
also calls the same converter. It emits low/medium/high WebP at 1024×512,
2048×1024 and 2880×1440, the existing `moon-lro.png` runtime path, and provenance
with source/derivative hashes and tool versions. No crop, AI enhancement or fake
elevation is applied. No source means the command exits nonzero. Genuine-image
conversion, UV orientation and landmark checks remain unrun until it is supplied.

## Kernel bootstrap

See [kernel setup](science/kernels/README.md). Six official NAIF kernels are
pinned with exact sizes/hashes; large data remain ignored. Python's standard
library is sufficient for fetching/verifying. This does not install or implement
SPICE computation. Scientific coverage and transforms require the later engine's
tests. Do not treat kernel integrity tests as ephemeris verification.

CI runs deterministic client, integrity and browser fixtures plus typecheck,
lint, secret-pattern scan and build. A live JPL schedule is deliberately deferred
until a real backend/parser is recovered. No release readiness is claimed while
those required scientific checks remain unavailable.
