# Kernel bootstrap (not a celestial-state engine)

The six pinned entries in [manifest.json](manifest.json) were downloaded from
NAIF over certificate-verified HTTPS on 2026-10-26. Sizes and SHA-256 hashes were
measured from those bytes, then a second download of every file was validated
against the pins by the saved downloader. These are locally established pins,
not claims of a publisher-signed SHA-256 catalogue. Review manifest changes as
scientific dependency changes. Total download: 50,899,257 bytes.

From the repository root with Python 3 (standard library only):

```sh
python3 science/scripts/fetch_kernels.py
python3 science/scripts/verify_kernels.py
npm run test:science
```

`data/` is ignored. No large kernel is committed. The fetcher validates every
manifest entry before contacting the network, permits only official NAIF HTTPS
URLs, rejects unapproved redirects, streams into a temporary file, caps bytes,
verifies exact size/hash, then atomically installs the verified file. Repeat
runs verify existing files. Corrupt existing files cause a failure and are not
silently overwritten. Remove a corrupt file only after investigating it.

Integrity verification does **not** verify scientific state, actual SPICE segment
coverage, frame transforms, or correctness of subsequent algorithms. No SPICE
runtime or science service was added in this phase. Coverage in the manifest is
from official comments/embedded documentation; future runtime activation must
inspect segment coverage, load the set, and verify transforms at multiple epochs.

The official `moon_de440_250416.tf` explicitly states compatibility with
`moon_pa_de440_200625.bpc`. It defines:

- `MOON_PA` → `MOON_PA_DE440` (principal axes, frame 31008).
- `MOON_ME` → `MOON_ME_DE440_ME421` (frame 31009), a fixed offset from PA.

Use ME for future cartographic/site work. Its close alignment with DE421 ME is
not identity; LOLA product frame differences need explicit treatment. PA is
retained for principal-axis calculations. Do not silently substitute IAU_MOON.

`earth_000101_270121_261025.bpc` is a dated ITRF93 orientation snapshot, not the
mutable latest alias. Its comment states last data epoch 2026-10-25; later
orientation includes prediction. Coverage ends 2027-01-21 (exact TDB endpoints
in manifest). Refresh requires an explicit new manifest/version and regression
checks; out-of-coverage requests must fail, not extrapolate.

DE440s embedded documentation lists Sun (10), Moon (301), Earth (399), Mercury
(199), Venus (299), and planetary barycentres 1–9. In particular, do not silently
label Mars/Jupiter/etc. barycentres as their body centres. Future physical
positions must state frame, centre, epoch, units and aberration convention.

Sources:

- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/
- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/moon_de440_250416.tf
- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/moon_pa_de440_200625.cmt
- https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/earth_000101_270121_261025.cmt
