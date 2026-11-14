# Requested LROC WAC imagery: retrieval, registration and manual import

## Actual status

The requested source is https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P, product `WAC_GLOBAL_E000N0000_008P` (8 pixels/degree as specified in the task). Access to the product page was blocked by the cloud proxy at CONNECT (HTTP 403). **No TIFF, IMG, label, publisher checksum or authoritative product metadata was retrieved here.** No screenshot of the website was used. No official WAC replacement is bundled or claimed to have been processed.

The existing Three.js qualitative Moon image remains explicitly labeled **legacy imagery / requested LROC unavailable**. Its earlier provenance and limitations remain in `public/textures/README.md`. This is a visible fallback, not a substitute passed off as LROC. No DEM, bump or displacement is derived from either image.

## Exact manual workflow on a permitted connection

1. Open the product URL above. Download the actual TIFF offered by that product page, retaining its original filename and associated product label/metadata. Record the actual download URL locally; a direct TIFF URL cannot be verified from this blocked environment and is deliberately not invented here. Do not download a webpage screenshot, thumbnail, preview JPEG or a different product.
2. Save the raw file and accompanying publisher metadata in ignored `.data/lroc/`. Use the Codespaces file explorer Upload action if it was downloaded on your computer. Never commit the raw TIFF/IMG.
3. Inspect it using a geospatial tool:

   ```sh
   gdalinfo -json .data/lroc/ORIGINAL_PRODUCT.tif > .data/lroc/gdalinfo.json
   sha256sum .data/lroc/ORIGINAL_PRODUCT.tif
   ```

   Independently review actual dimensions, geographic extent versus valid/no-data coverage, pixel encoding/bit depth, lunar reference body/datum/radius, projection, east-positive longitude, north-up orientation, pixel-area versus pixel-point registration and usage terms. The local SHA-256 identifies the bytes; it is not a publisher authenticity check. Verify the publisher's digest with its matching algorithm when supplied.

4. The implemented display importer accepts **only** classic 8-bit, single-page GeoTIFF with 2880×1440 pixels, geographic angular degrees, user-defined lunar CRS citation, PixelIsArea, 0.125° pixel scale, northwest edge −180° longitude / +90° latitude, no rotation and north up. It rejects Earth EPSG codes, unexpected dimensions, missing registration, ambiguous orientation, BigTIFF and unsupported encodings. These restrictions are intentionally conservative and may reject the actual downloaded product.
5. If the source uses a different valid lunar projection/longitude range, do not change its tags by guessing. A geospatial operator must explicitly reproject from the **reviewed original lunar SRS**. A template, not a validated conversion of this inaccessible product, is:

   ```sh
   gdalwarp -t_srs "+proj=longlat +R=$REVIEWED_MOON_RADIUS_METRES +no_defs" \
     -te -180 -90 180 90 -tr 0.125 0.125 -r near \
     .data/lroc/ORIGINAL_PRODUCT.tif .data/lroc/REGISTERED_DISPLAY.tif
   ```

   `REVIEWED_MOON_RADIUS_METRES` must come from the actual product metadata. Confirm the resulting lunar citation/units and all registration keys using `gdalinfo`. This command does not automatically convert scientific bit depths or validate the source SRS. Non-8-bit source display scaling needs a separate documented review; no automatic contrast enhancement or silent clipping is performed by this importer.

6. Copy `docs/science/lroc-imagery-review.example.json` into `.data/lroc/review.json`. Fill actual datum, licensing, attribution and source retrieval UTC; record the publisher SHA-256 if one exists, otherwise retain null. Set `registrationChecked` to true **only after** comparing the source and prepared display at the prime meridian, ±180° seam, north/south hemispheres, poles and recognizable features. Extent includes nominal raster coverage; blank/no-data pixels must not be interpreted as surface shadow. No no-data repair/inpainting is implemented.
7. Convert the reviewed display file and launch:

   ```sh
   npm run science:import-moon -- .data/lroc/REGISTERED_DISPLAY.tif .data/lroc/review.json
   npm run build
   npm start
   ```

   If the original TIFF already meets every supported criterion, pass its actual filename instead of REGISTERED_DISPLAY. The converter inspects TIFF metadata and Sharp decoder dimensions, verifies the supplied digest, and writes ignored `public/textures/lroc-moon.jpg` plus `lroc-moon.json`. Conversion is 8-bit sRGB JPEG quality 94 with **no crop, flip, rotation, synthetic features, brightness-to-height transform or added detail**. Original and display checksums, registration, source identity and processing date are recorded. The input review cannot overwrite source files; arbitrary extra review fields are not copied into the served manifest.

8. Rebuild/restart and reload the app. `/api/imagery` validates the manifest and display hash before selecting the imported map for both Solar System Moon and Mission Control. Inspect the new provenance label and independently recheck geographic markers against real source landmarks. A failed or absent import remains an explicit legacy fallback, not a fabricated success.

## What is and is not validated

Automated tests use a mathematically registered **synthetic TIFF fixture in a temporary directory** to test dimensions, angular units, seam/pole extents, orientation rejection, checksum handling and the real Sharp conversion path. They do not validate this LROC product’s real registration, photometry, valid coverage or licensing. No synthetic image is installed in the application.

At 8 pixels/degree this is global context imagery, not close-up terrain detail. No higher-resolution LROC product was retrieved or registered in this phase; selecting one requires its real label, map projection, coverage, resolution, no-data and source attribution. Do not stretch this product into invented close-up detail or describe it as a terrain model.
