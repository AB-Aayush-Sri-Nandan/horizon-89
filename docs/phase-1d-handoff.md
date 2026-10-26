# CHATGPT HANDOFF — HORIZON 89

Phase 1D — restore the supplied LROC morphology texture and verify rendering.
No JPL queries, backend changes, new scientific calculations or subsequent phase.

## 1. Existing attachment

The previously supplied `WAC_GLOBAL_E000N0000_008P.TIF` was accessible using its
existing attachment ID. No duplicate upload or substitute Moon image was used.
The original is retained at the ignored local path
`assets/source/lroc/WAC_GLOBAL_E000N0000_008P.TIF`, outside `public/` and Git.

## 2. Source metadata and provenance

- Source: 4,153,799 bytes, TIFF, 2880×1440, single-channel 8-bit unsigned grayscale,
  uncompressed, BlackIsZero, orientation 1, no alpha or embedded ICC profile.
- Source SHA-256: `8a9077d46618ae617234d38794bcaef3a79be9df63e7dbcf1362ec2fb5fe6164`.
- Decoded source-pixel SHA-256: `5c4b53c8b9a81d4fee9704e481c11783ffb2b1b82f5d90bf46bed53d7da72616`.
- GeoTIFF citation: Equirectangular Moon / GCS_Moon / D_Moon / Moon_localRadius /
  Reference_Meridian. Radius 1,737,400 m; PixelIsArea; scale 3790.4188030187 m/px;
  raster origin at (-5458203.0763469,2729101.5381735) m. These agree with global
  −180…180° longitude and −90…90° latitude at 8 px/degree, north-up, 0° central meridian.
- GDAL scale/offset and nodata=0 were recorded as source metadata. They were not
  applied as physical height or calibrated reflectance. Original display pixels
  were retained, including source nodata/brightness differences.
- Attribution: NASA / GSFC / Arizona State University (LROC).

The official product page was successfully consulted:
https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P

Dimensions, resolution, extent and projection are consistent with that product.
Its TIFF download link is recorded in `assets/lroc-source.json`. One bounded
attempt to compare the supplied bytes with that official TIFF was blocked:
`Tunnel connection failed: 403 Forbidden` on `pds.lroc.im-ldi.com`. No network
security setting was changed or bypassed. Thus the file is pinned and metadata-
consistent, but independent official-byte authenticity is not established.

## 3. Exact files added or changed

Added:

- `assets/README.md`: provenance, source handling, regeneration, mapping and limits.
- `assets/lroc-source.json`: reviewed source hash, metadata, attribution and limitations.
- `public/textures/moon-lro.png`: the single versioned runtime image.
- `public/textures/provenance.json`: reproducible source/conversion/output metadata.
- `src/science/lunar-map.ts`: the existing display mapping extracted for verification.
- `tests/moon-texture.test.ts`: six asset/pixel/UV/source-guard tests.
- `tests/browser/moon-texture.spec.ts`: successful rendering/controls and decode-failure tests.
- `docs/phase-1d-handoff.md`: this report.

Modified:

- `.gitignore`: ignore original scientific imagery at `/assets/source/`.
- `README.md`: current asset state and conversion instructions.
- `scripts/convert-moon.cjs`: checksum-pinned, pixel-verified lossless PNG pipeline.
- `server/README.md`: documentation-only correction to the formerly missing-imagery note.
- `src/App.tsx`: use the equivalent testable mapping; distinguish image LOADING state.
- `src/components/MoonModel.tsx`: explicit image orientation/wrapping, map activation,
  and the preserved neutral fallback. No displacement/bump/normal map.

No backend implementation, scientific contracts, diagnostics, cache, tests or
provider was changed. No package/dependency/lockfile change. No original TIFF,
unused WebP files, screenshots or intermediate image is committed.

## 4. Conversion method

From the repository root: `npm run assets:moon` (compatibility command
`node src/convert-moon.cjs` still works). An explicit reviewed source path is
accepted after `--`; its exact size/hash must match the source manifest.

Existing sharp 0.35.5 / libvips 8.18.7 converts to `b-w` PNG with compression level 9.
No resizing, crop, enhancement, contrast adjustment or artificial surface detail.
Before writing, the converter decodes the output and verifies EVERY grayscale
pixel against the reviewed source-pixel hash. Wrong source fails without changing
existing outputs. Repeated conversions produced identical PNG/metadata bytes
with the same manifest and recorded toolchain. The source is not needed to serve
or test a fresh Git checkout; it is needed only for regeneration.

## 5. Runtime asset

`public/textures/moon-lro.png`: PNG, 2880×1440, one 8-bit grayscale channel,
3,411,388 bytes (3.253 MiB), SHA-256:
`c3bddf96dbf9c4c3b644b0fd91e5fba80f7725362c25c1523b33cd0b8e91dbf6`.

This is below the 3.5 MB asset test budget. Full resolution preserves all source
features losslessly. It is smaller than the 4.15 MB source and a 4.63 MB RGB-PNG
conversion. Only this runtime image is committed; no unused quality copies.
The production build was checked to contain the PNG and no `.tif`/`.TIF` source.
The moderate single-file size does not require LFS or a repository-size exception.

## 6. UV, geographic conventions and seam

The existing scene convention is preserved:

```text
u = (east longitude + 180) / 360
v = (latitude + 90) / 180
0° longitude → +X; 90° east → −Z; 90° west → +Z
±180° seam → −X; north → +Y
```

Tests compare these positions with all 561 vertices of an actual Three.js
32×16 SphereGeometry (including pole UV offsets and both seam sides). Float32
agreement tolerance is 1e-6 scene units; it is NOT a lunar geographic accuracy
claim. GeoTIFF map bounds are separately checked against tiepoint/scale/radius.

The texture uses `flipY=true`, horizontal RepeatWrapping and vertical
ClampToEdgeWrapping, sRGB visual colour handling, and the same geometry as before.
Material replacement when map availability changes makes shader activation
explicit. The map's north/south and east/west relationship agrees with the source
map and the existing marker convention.

The flat source and near-side globe were visually inspected: familiar near-side
maria and bright crater patterns are qualitatively consistent between them.
No independent named-landmark control-point catalogue or surveyed registration
was used; exact geographic accuracy and a particular NAIF frame realization
remain unverified. A loaded image alone is not geographical validation.

Source seam limitation: first/last source columns have unequal brightness.
Across rows 80…1359 their mean absolute 8-bit difference is 64.379, versus
34.518/35.930 for adjacent columns at the left/right edges. These are image
statistics, not geographic residuals or a diagnosis of the source mosaic's cause.
RepeatWrapping avoids a clamped boundary but does not make the source
radiometrically seamless. No repainting or blending was used to hide differences.

## 7. Chromium visual verification and evidence

The browser fetched the actual PNG (HTTP 200, image/png, matching content hash),
and the live R3F scene reported the expected decoded dimensions, map colourspace,
flip/wrap settings and no bump/displacement maps. The successful-image test
recorded ZERO broken texture requests, ZERO uncaught page errors and ZERO console
errors. Actual camera positions/radius changed on drag/wheel; target controls
and mission dashboard remained usable. Near-side and far-side target views were
captured from the existing initial camera.

Screenshots were inspected and copied for review outside Git:

- `/workspace/artifacts/horizon89-phase1d/moon-nearside.png`
- `/workspace/artifacts/horizon89-phase1d/moon-farside-app-lighting.png`
- `/workspace/artifacts/horizon89-phase1d/moon-farside-seam-inspection.png`
- `/workspace/artifacts/horizon89-phase1d/moon-neutral-fallback.png`

Near-side evidence is captioned: VISUAL TEST / controlled telemetry fixtures.
The far side is dark under the existing production illustrative lighting. An
additional screenshot uses a clearly captioned TEST-ONLY inspection fill to see
the seam; it does NOT reflect a production lighting change or calculated lunar
illumination. Its blue cast is the test-amplified existing ambient-light colour,
not a recoloured source texture. The scientific telemetry in these screenshots
is controlled fixture data, not a successful JPL retrieval.

## 8. Fallback

Existing forced-404 tests pass with the real asset present in the repository.
A new HTTP-200/invalid-PNG test verifies decode failure leaves the neutral sphere,
null texture map, UNAVAILABLE image label, interactive scene and no uncaught page
error. The UI never labels the fallback as LROC imagery. LOADING is now explicit.

## 9. Tests and checks

| Command/check | Result |
|---|---|
|npm test|21 passed, 0 failed (15 existing + 6 asset/mapping tests)|
|npm run test:backend|25 passed, 0 failed|
|npm run test:science|7 passed, 0 failed; integrity only|
|npm run typecheck|PASS|
|npm run lint|Oxlint: 0 errors, 3 existing React warnings|
|npm run build|PASS; no source TIFF in dist|
|PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser|7 passed, 0 failed|
|Same browser command restricted to tests/browser/moon-texture.spec.ts|2 passed after adding explicit screenshot captions/inspection evidence|
|npm run check:secrets|0 flagged versionable text files|
|git diff --check|PASS|
|npm run assets:moon repeated conversion|PASS; same-input byte reproducibility and source-pixel identity|

Total distinct tests: 60 (21+25+7+7), no failures or skips. The two affected browser
tests were rerun after evidence-only changes; they do not add two new test cases.
Full browser run: zero uncaught errors in all tests. Intentional asset/API failure
console counts were 1,2,2,1,2,0,0; actual-texture success and corrupt-image decode
cases had zero console errors. THREE.Clock deprecation and process colour-setting
warnings remain. The new image evidence test has a 60-second deadline for software
WebGL initialization and two full texture loads, without relaxing assertions.

## 10. Performance

JavaScript: 1,177.55 kB raw / 324.25 kB gzip, versus 1,177.39 / 324.19 previously
(+0.16 / +0.06 kB). CSS unchanged: 22.12 kB / 6.74 kB gzip. The >500 kB JS chunk
warning remains. No new rendering engine, package, postprocessing or geometry.

Restoration adds one 3.41 MB static image transfer. A conservative RGBA8 GPU
planning estimate is 15.82 MiB, about 21.09 MiB with mipmaps; actual browser GPU
allocation was not measured. Only one Moon map is active, with explicit disposal.
No FPS/VRAM certification on the target laptop is claimed from software Chromium.

## 11. Scientific limitations

LROC WAC is visual morphology, NOT LOLA elevation, a scientific bump/normal/
displacement map, terrain horizons, terrain-corrected shadows, or solar power.
Existing render lights remain explicitly illustrative. Source mosaic shading
is not current illumination or calibrated reflectance. Exact upstream-byte
authentication, surveyed landmark registration and source seam continuity remain
limitations. No SPICE transform or terrain calculation was added or implied.
Phase 1C JPL errors and scientific UNAVAILABLE behavior are preserved; no unchanged
JPL request was repeated during this task.

## 12. Git and environment

Started clean at `72b915dd6bf970a75868e491bc01d27acab70acd` on the existing dedicated
branch `feat/horizon89-phase1b-backend`. Safe changes and the runtime PNG are
committed/pushed only to that branch, with the final SHA supplied in the completion
response. No force push, main merge, secret, raw TIFF or unnecessary binary.
Original source and screenshots remain local/ignored or outside the checkout.

Reusable environment startup notes were updated to remove the stale missing-image
claim and describe the new provenance/regeneration/test state. No network setting
or install command was changed. Draft persistence is not publication; no new-task
restoration is claimed. Git source preservation is independent of publication.

## 13. Remaining blockers

The visual texture is restored and usable. Independent upstream-byte comparison
is blocked by the LROC download host's proxy403. Exact geographic registration
and source brightness seams are not solved by texture loading. The separate
JPL LTKERNL/IP_ADDR scientific blocker remains as documented in Phase 1C.

## 14. Recommended next milestone

Resolve the existing JPL service-path blocker with the retained evidence, then
perform bounded successful real Sun/Earth retrieval, historical numerical
comparison and real-cache validation after a meaningful change. No repeat probes
or subsequent architecture phase were started in this texture task.

STOP. No Solar System Navigator, Cesium, LOLA terrain, SPICE calculations or
Copilot expansion was started.
