# Bundled Moon imagery

`moon.jpg` is the genuine equirectangular lunar image supplied in the Three.js examples (`moon_1024.jpg`), downloaded 2026-11-08 over verified HTTPS:

https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg

1024 × 512 pixels, JPEG, sRGB, 238,093 bytes.
SHA-256: fcb0f1f5548e6e18d40063dd55c6aacd3daedf2407b181dab85b61e22bf9fe57

The upstream repository’s MIT license is included as `THREE-LICENSE.txt`. Upstream supplies no acquisition, calibration, registration or original imaging-instrument metadata alongside this image. HORIZON 89 makes no assertion that it is LRO imagery. It is used for qualitative surface context, not precision mapping, elevation or scientific measurement. Marker coordinates are spherical east-positive geographic coordinates; image registration is not independently calibrated.

No image generation, color filter, synthetic craters or inferred topography is used. There is deliberately no bump/displacement map derived from brightness. The original checkout's `moon-lro.png` and source TIFF were absent. `src/convert-moon.cjs` remains an optional conversion helper for separately provided original data; it is not required to run this viewer.
