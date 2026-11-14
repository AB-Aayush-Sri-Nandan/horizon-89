# Lunar terrain ingestion and evidence review

## Current evidence status

No authoritative DEM, PSR mask, illumination grid, crater-feature catalog or new as-landed coordinate record was retrieved in Phase 2. Proxy CONNECT requests to the PDS Geosciences node, LOLA team host, USGS Astrogeology, NASA PGDA, LROC and JPL were denied (HTTP 403). The app therefore ships **no terrain observations**. The Moon remains photographic imagery, not a DEM. Disabled controls are intentional scientific availability states.

[candidate-inventory.json](candidate-inventory.json) records candidate source paths and all still-unknown metadata. Candidate filenames are discovery leads, not verified product identifiers or guarantees that a URL exists. No product’s resolution, projection, coverage, no-data constant, epoch or license was guessed from its filename. The original source response must be reviewed on a permitted network.

## Reproducible steps

1. At an authoritative catalog, verify the exact product identity/version and detached PDS3 label/image URLs. Review projection, spherical reference radius, axis directions, coordinate conventions, scale, offset, vertical datum, units, coverage, no-data, product processing epoch, attribution and usage terms. Locate the publisher checksum if one exists. Preserve any acquisition-interval metadata in the original label and review record; product creation time is **not** an observation epoch.
2. Retrieve without disabling TLS or proxy trust. Set the following to **reviewed real URLs**, not the unverified candidate strings:

```sh
npm run science:fetch -- "$REVIEWED_LABEL_URL" "$REVIEWED_IMAGE_URL" .data/lola "$PUBLISHER_SHA256"
```

Omit the fourth argument when the publisher supplies no SHA-256. The downloader only accepts authoritative HTTPS hosts, checks redirects, caps downloads (2 MB label, 2 GB image), records streamed hashes and never overwrites an existing downloaded file. A local hash alone proves reproducibility, not publisher authenticity. Other publisher checksum algorithms must be verified with their matching tool before ingestion; never replace their expected values.

3. Copy `docs/science/provenance.example.json` to an ignored `.data/.../provenance.json`. Replace every placeholder with reviewed metadata. The `productId` must exactly match the label. Include a clear `datumDescription`, verified usage terms, required attribution and `retrievedAt` containing the actual source retrieval ISO UTC time ending in Z. Processing time is recorded separately as `processedAt` and is not an access date. Set `expectedSha256` only to the publisher’s real SHA-256, otherwise keep null and preserve the local-only integrity limitation.
4. Validate the local inputs without writing terrain, then run the actual converter:

```sh
npm run science:inspect -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json
npm run science:ingest -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json public/science/terrain.json
npm run build
npm start
```

The inspector and converter check product identity, file size, optional publisher SHA-256 and explicit geospatial metadata. Inspection writes no tile. Conversion stages files and publishes the tile last, so a validation/processing failure does not truncate an existing tile. Source URLs cannot contain embedded credentials. It writes one small terrain JSON and a provenance sidecar containing the complete original label, reviewed metadata and hashes. Raw files stay in ignored `.data/`; generated science files are ignored by default to avoid accidental distribution of unreviewed data. To include an approved small tile in a release, review the product’s usage terms and explicitly add the generated artifacts. Rebuild/restart after import; production reads the built `dist/science/terrain.json`.

5. Inspect `/api/science` internally: available requires a structurally valid bounded artifact. In Lunar science, enable elevation and/or slope, inspect the legend/provenance, then return to Mission control and focus 89°S. Compare numbers against independently decoded source pixels and inspect registration before presenting imported results as scientifically validated. The current application plumbing is tested with synthetic fixtures; no authoritative-file registration validation has happened here.

## Supported subset and rejection behavior

Supported: detached PDS3 single-band unpadded rasters, explicit `^IMAGE = "filename"`, signed 16-bit little/big endian or 32-bit little/big endian floating-point samples, explicit metres for scaled heights, numeric scale/offset/no-data, east-positive longitude, planetocentric latitude and a spherical lunar radius. Projection support is equatorial equirectangular/simple cylindrical or pole-centered spherical stereographic. Label group structure, duplicate fields, dimensions, units and finite numeric values are checked. Unsupported or ambiguous input fails rather than guesses.

Unsupported: PDS4 XML, GeoTIFF, ISIS cubes, attached/record-offset images, multiline metadata values, packed/multiband/padded/compressed rasters, numeric-radix no-data literals, west-positive conventions, nonspherical/triaxial bodies and other projections. Some real LOLA products may require a different decoder or an explicitly reviewed metadata adaptation. A promising filename does not establish compatibility with this deliberately limited parser. Do not edit scientific values or silently infer missing fields to make a product pass.

## Methods

PDS map equations use one-based sample/line:

`x = (sample − SAMPLE_PROJECTION_OFFSET − 1) × MAP_SCALE`

`y = (LINE_PROJECTION_OFFSET − line + 1) × MAP_SCALE`

The library returns zero-based indices. For spherical equirectangular at the equator: `x = R(λ−λ₀)`, `y = Rφ`. For polar stereographic, sign `s = ±1`, `ρ = 2R tan(π/4 − sφ/2)`, `x = ρ sin(λ−λ₀)`, `y = −sρ cos(λ−λ₀)`. Longitude wraps only for cylindrical rasters whose width establishes full global coverage. Inverse transforms are round-trip tested. Real product pixel-center registration still needs an independent authoritative-file comparison.

Raw missing/nonfinite values are rejected **before** applying `height = raw × scale + offset`. No-data stays JSON null and transparent in visualizations. A missing elevation never becomes zero.

The output is a nearest-source-pixel sampled 181×91 grid spanning 80°S–90°S and −180°–180° east-positive longitude. This display spacing is distinct from the label’s native map scale. Narrow features may be missed; these are bounded contextual samples, not native-resolution tiles or a precision terrain model. Selected values identify the nearest display-grid location; the source pixel center may differ by up to half a native pixel in each raster direction.

Slope uses central differences on the **original raster**, not on the downsampled image:

`atan(hypot((east−west)/(2d), (north−south)/(2d)))` in degrees.

For polar stereographic, local scale is corrected using `k = 2/(1+sin(|φ|))`, `d = mapScale/k`, at the actual source pixel center. Missing neighbors/borders produce unavailable slope. This is a local finite-difference surface-gradient approximation; it is not a landing-hazard metric. Cylindrical slope is deliberately unavailable because its anisotropic ground spacing is not implemented. Roughness and suitability scoring are not calculated.

The globe overlay colors sourced heights or slopes at a slight display offset above the photographic sphere to avoid z-fighting. It is explicitly **not displacement or terrain relief geometry**. The natural Moon is retained. If both switches are on, slope is the displayed color channel; turning slope off restores elevation. Numeric minimum/maximum and units appear in the science legend. Independent switches preserve their settings across navigation.

## Illumination and permanent shadow

No illumination computation or PSR integration is claimed. A defensible future calculation needs terrain over a sufficient horizon radius, source geometry for the exact UTC/site/frame, horizon obstruction and documented spatial/time resolution. A direct PSR product needs a verified georeferenced mask and its observation/model interval. A single low Sun angle, dark photographic pixel or terrain slope cannot establish permanent shadow, ice or communication availability.

## Memory and failure behavior

Ingestion streams raw image hashes and caches at most 16 source rows (maximum 6.4 MB at the parser’s width/encoding cap), rather than loading a massive image into RAM. The normal output has 16,471 cells. Runtime rejects tiles larger than 361×181 or files over 2 MB, loads inventory once per frontend mount, and constructs bounded disposable GPU buffers only when a layer is enabled. Missing or rejected science artifacts return HTTP 200 with an explicit unavailable inventory; the existing Moon and all navigation remain operational.
