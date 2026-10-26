# Reviewed LROC visual imagery

`lroc-source.json` records the supplied original TIFF's identity, hashes,
metadata, official product/download URLs and limitations. The attachment was
accessible and was inspected; it was not replaced with another Moon image.

The source is **consistent with** the official LROC WAC product metadata:
2880×1440, 8-bit single-channel grayscale, 8 px/degree, global simple-cylindrical
projection with 0° central meridian, north-up and east longitude increasing left
to right. GeoTIFF tags name Equirectangular Moon / GCS_Moon, spherical radius
1,737,400 m, PixelIsArea, pixel scale 3790.4188030187m, and tiepoint
(-5458203.0763469,2729101.5381735)m at raster(0,0). These imply map edges
−180…180° longitude and −90…90° latitude. Pixel centres are half a pixel inside
those edges. The generic datum citation does not establish a precise NAIF frame.

The official product page was read on 2026-10-26:
https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P

Its TIFF link is recorded in the manifest. An attempted independent byte
comparison was blocked by proxy 403 on `pds.lroc.im-ldi.com`. No network policy,
TLS validation or data provider was changed to bypass that. The SHA-256 is a pin
of the reviewed supplied attachment, not an independently verified NASA checksum.
Attribution: NASA / GSFC / Arizona State University (LROC).

## Reproduce the runtime PNG

The 4,153,799-byte TIFF is retained locally at the ignored path
`assets/source/lroc/WAC_GLOBAL_E000N0000_008P.TIF`, outside Vite's public directory.
It is not included in Git or copied into the production build. A fresh checkout
already contains the runtime PNG and provenance; conversion alone requires the
original reviewed TIFF (or an exact source matching its pinned hash).

From the repository root:

```sh
npm ci
npm run assets:moon
# Equivalent compatibility entry point:
node src/convert-moon.cjs
# An explicit reviewed source path is also supported:
npm run assets:moon -- /path/to/WAC_GLOBAL_E000N0000_008P.TIF
```

Existing sharp/libvips converts to lossless 8-bit grayscale PNG at the original
2880×1440. There is no crop, resampling, enhancement, contrast change or colour
painting. GDAL scale/offset/nodata tags are retained as provenance, not used to
invent radiometry or height. ALL decoded PNG pixels are compared to the reviewed
source-pixel SHA-256 before writing. Wrong source/checksum fails closed.

Outputs:

- `public/textures/moon-lro.png`: 3,411,388 bytes, full-resolution single-channel PNG.
- `public/textures/provenance.json`: source details, conversion versions and hashes.

Repeated conversion produced identical PNG and metadata bytes with the recorded
toolchain. There are no unused WebP quality levels or source/intermediate TIFFs
in the public directory. A single 3.25 MiB runtime asset is committed: this keeps
all original features losslessly and is below the 3.5 MB test budget. The PNG is
smaller than the source and the 4.63 MB RGB-PNG conversion. No new package is needed.

## Rendering and orientation

`SphereGeometry` default UVs and the existing marker convention agree:

```text
u = (east longitude +180)/360
v = (latitude +90)/180
position = (-cos(phi)*cos(latitude), sin(latitude), sin(phi)*cos(latitude))
phi = east longitude +180 degrees
```

Thus0° longitude is+X,90° east is−Z,90° west is+Z, the±180° seam is−X,
north is+Y. Image `flipY=true` puts the north/top row at v=1. Horizontal
RepeatWrapping permits seam interpolation; vertical ClampToEdge prevents pole
wrapping. The source's cylindrical pole stretching is preserved, not painted out.
Tests compare marker positions to actual Three sphere UV vertices including
both seam sides. The first/last source columns have unequal brightness: horizontal
wrapping avoids a clamped texture boundary but cannot guarantee a seamless source
mosaic. No seam painting/blending was applied to hide source differences. Longitude/latitude alignment is a rendering convention, not a
validated SPICE transformation or surveyed ground-control solution.

The texture is sRGB visual morphology, with no bump, normal or displacement map.
Material replacement on texture availability makes shader-map activation
explicit and leaves the neutral sphere available on missing/undecodable imagery.
The pre-existing light positions and fill remain illustrative; the UI labels
this. Source-mosaic shading plus added render lighting is NOT current lunar
illumination, terrain shadowing, topography or a solar-power analysis.

At 2880×1440, a conservatively budgeted RGBA8 upload is 15.82 MiB, or about 21.09 MiB
with a full mip chain. The browser may store grayscale differently; these are
planning estimates, not measured GPU allocations. Only one Moon texture is
active. Transfer-file compression does not determine GPU memory. Renderer/DPR,
stars, camera model and quality modes are otherwise unchanged.

Browser evidence uses the real committed PNG and test-only scientific API
responses; it is visual/rendering verification, not a successful live Horizons
calculation. Existing forced404 tests and a new HTTP200-invalid-image test keep
failure behavior under coverage.
