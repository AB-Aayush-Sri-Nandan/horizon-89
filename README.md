# HORIZON 89 — CLPS Lunar Mission Browser

Existing React 19 / TypeScript / Vite / React Three Fiber frontend. Node 24 and
npm 11 were used for the current baseline. See [repository audit and technical
roadmap](docs/architecture.md), [Phase One handoff](docs/phase-one-handoff.md), and
[current reconstructed API documentation](server/README.md).

```sh
npm ci
npm run science:setup
npm run typecheck
npm run lint
npm test
npm run test:backend
npm run test:science
npm run test:celestial
npm run check:secrets
npm run build
npm run dev:api
# In a second terminal:
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

Phase 1B reconstructs an Express backend (not recovered historical code). See
[API setup, endpoints and scientific conventions](server/README.md). `/api`
proxies to 127.0.0.1:3001; health is available, but live JPL geometry remains
blocked by upstream LTKERNL/IP_ADDR errors. Copilot is deliberately unavailable;
provider keys stay server-side and no AI calls are enabled. No credentials are
needed for Horizons. Never put credentials into `VITE_*` variables.

The supplied LROC TIFF has been converted to a full-resolution, lossless visual
texture. The original is locally retained outside the production asset folder;
only the 3.41 MB runtime PNG and provenance are committed. Source metadata matches
the intended LROC product; independent upstream-byte authentication was blocked
by the source-download host's proxy policy. See [imagery provenance, reproduction
and mapping](assets/README.md).

Missing or corrupt imagery still uses a labelled neutral sphere. Lighting is
illustrative, not a science-derived terminator; morphology is never used as
height, a bump map or terrain shadow data. No current illumination, terrain-aware
visibility or RF-link claim follows from loading this image.

## Genuine Moon asset pipeline

The reviewed source is retained locally at the ignored path
`assets/source/lroc/WAC_GLOBAL_E000N0000_008P.TIF`. Run `npm run assets:moon` from
the repository root to reproduce the PNG and provenance at `public/textures/`.
An explicit reviewed source path may be passed after `--`; its size/hash must
match `assets/lroc-source.json`. Source pixels are verified unchanged before
writing. A fresh Git checkout can serve/test the committed image without the
original TIFF. Source retrieval is needed only for regeneration.

## Kernel bootstrap

See [kernel setup](science/kernels/README.md). Six official NAIF kernels are
pinned with exact sizes/hashes; large data remain ignored. Python's standard
library is sufficient for fetching/verifying. The separate [local celestial engine](science/README.md) now inspects actual
coverage and computes SPICE states/orientations. Its real-computation tests are
separate from content-integrity checks.

CI runs deterministic client, integrity and browser fixtures plus typecheck,
lint, secret-pattern scan and build. A live JPL schedule is deliberately deferred
until live scientific validation succeeds. No release readiness is claimed while
those required scientific checks remain unavailable.

## Scientific Celestial Engine (Phase2A)

See [science setup, supported bodies/frames and limitations](science/README.md).
The new `/api/science/capabilities` and `/api/celestial-state` routes use a private
local SPICE worker. They do not replace `/api/horizons`, change dashboard state,
or start Solar System graphics. Body centres absent from DE440s remain explicitly
UNAVAILABLE. Run `npm run science:setup` before backend/science-computation tests.
