# Horizons verification protocol and outstanding reference checks

## Actual outcome

On 2026-11-08 the remote runner retrieved **0 of 8** requested observer solutions and exited nonzero. All direct JPL probes were denied by the proxy at CONNECT (HTTP 403); runner errors were `fetch failed`. No live numerical or coordinate-frame validation is claimed. The report is [horizons-verification-2026-11-08.json](horizons-verification-2026-11-08.json).

## Run on an allowed network

```sh
npm run science:verify-horizons -- .data/horizons-verification
```

The script retrieves official API output, validates its returned timestamp, records each exact request, saves unmodified successful responses plus SHA-256 and a run report, and exits nonzero if any case fails. Successful retrieval alone is explicitly labeled **not independently cross-checked**. No synthetic output replaces a failed request.

| Location   | UTC                 | Targets           |
| ---------- | ------------------- | ----------------- |
| 89°S, 0°E  | 2025-03-02 00:00:00 | Sun 10, Earth 399 |
| 89°S, 0°E  | 2025-03-02 12:00:00 | Sun 10, Earth 399 |
| 0°, 0°E    | 2024-02-29 00:00:00 | Sun 10, Earth 399 |
| 85°N, 90°E | 2025-03-02 06:00:00 | Sun 10, Earth 399 |

## Independent check still required

For each case use official Horizons web or batch mode separately from the application’s URL builder, selecting a lunar surface observer, the same geographic coordinates and zero-km observer height, airless observer azimuth/elevation, UTC and the Sun/Earth target. Preserve the reference setup/output with its own retrieval time. Compare exact returned calendar instants, body IDs, source observer/body-fixed reference model, longitude/latitude conventions, azimuth orientation, elevations and units. Record reference precision before choosing a numerical tolerance; do not invent an acceptance threshold without knowing the official output precision. Explain any differences rather than changing the expected values.

Official documentation: https://ssd.jpl.nasa.gov/horizons/manual.html

Current request settings are `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, east-positive `SITE_COORD='lon,lat,0'`, `QUANTITIES='4'`, `APPARENT='AIRLESS'`, `TIME_TYPE='UT'`, `TIME_DIGITS='FRACSEC'`, `CAL_FORMAT='CAL'`. The Moon’s geodetic versus planetocentric equivalence/reference shape must be checked against the actual returned model; a generic “lunar” label is not sufficient evidence. The server now accepts 1962–2100 UTC only: Horizons UT before 1962 may be UT1 and is not silently labeled UTC.

## Local verification completed

Tests cover geographic input limits, leap day/midnight, invalid/non-UTC/calendar input, returned timestamp mismatch (including seconds), missing table terminator, invalid/unavailable numbers, timeout/network failure and expired cache refetch. The parser explicitly checks the first returned calendar instant against the requested UTC (1 ms tolerance matching millisecond input/output precision) and rejects mismatches. Telemetry no longer relies solely on the server copying the requested timestamp into response metadata.

No terrain obstruction, refraction, radio link budget, surface illumination or permanent-shadow result is inferred from the flat-horizon ephemeris. Cached values are bound to exact site and time; expiry refetch is tested with a controlled clock.
