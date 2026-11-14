/** Minimal classic-TIFF registration reader. Unsupported projections/layouts fail closed. */
export function inspectGlobalWAC(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 16) throw new Error("Truncated TIFF");
  const marker = String.fromCharCode(bytes[0], bytes[1]),
    little = marker === "II";
  if (!little && marker !== "MM") throw new Error("Not a TIFF");
  if (view.getUint16(2, little) !== 42)
    throw new Error("Only classic TIFF supported (not BigTIFF)");
  const offset = view.getUint32(4, little);
  if (offset + 2 > bytes.length) throw new Error("Invalid TIFF directory");
  const count = view.getUint16(offset, little);
  if (count > 512 || offset + 2 + count * 12 + 4 > bytes.length)
    throw new Error("Invalid TIFF metadata bounds");
  const entries = new Map<number, number[]>();
  let citation = "";
  const seen = new Set<number>();
  for (let i = 0; i < count; i++) {
    const p = offset + 2 + i * 12,
      tag = view.getUint16(p, little),
      type = view.getUint16(p + 2, little),
      n = view.getUint32(p + 4, little),
      size = ({ 2: 1, 3: 2, 4: 4, 12: 8 } as Record<number, number>)[type];
    if (seen.has(tag)) throw new Error("Duplicate TIFF tag");
    seen.add(tag);
    if (!size) continue;
    if (n > 65536) throw new Error("Oversized TIFF tag");
    const start = n * size <= 4 ? p + 8 : view.getUint32(p + 8, little);
    if (start + n * size > bytes.length)
      throw new Error("TIFF tag outside file");
    if (type === 2) {
      if (tag === 34737)
        citation = new TextDecoder()
          .decode(bytes.slice(start, start + n))
          .replace(/\0/g, "");
      continue;
    }
    const values = Array.from({ length: n }, (_, j) =>
      type === 3
        ? view.getUint16(start + j * size, little)
        : type === 4
          ? view.getUint32(start + j * size, little)
          : view.getFloat64(start + j * size, little),
    );
    if (values.some((v) => !Number.isFinite(v)))
      throw new Error("Nonfinite GeoTIFF metadata");
    entries.set(tag, values);
  }
  const width = entries.get(256)?.[0],
    height = entries.get(257)?.[0],
    bits = entries.get(258),
    orientation = entries.get(274)?.[0] ?? 1,
    scale = entries.get(33550),
    tie = entries.get(33922),
    directory = entries.get(34735);
  if (width !== 2880 || height !== 1440)
    throw new Error("WAC 008P requires 2880×1440 pixels (8 px/degree)");
  if (!bits?.every((v) => v === 8))
    throw new Error(
      "Only reviewed 8-bit display TIFF supported; do not silently clip scientific bit depths",
    );
  if (orientation !== 1 || entries.has(34264))
    throw new Error("Only explicit north-up, unrotated TIFF supported");
  if (!scale || !tie || tie.length !== 6 || !directory)
    throw new Error("GeoTIFF pixel scale, tiepoint and GeoKeys are required");
  const keys = new Map<number, number>();
  for (let i = 4; i + 3 < directory.length; i += 4) {
    if (directory[i + 1] === 0 && directory[i + 2] === 1)
      keys.set(directory[i], directory[i + 3]);
  }
  if (keys.get(1024) !== 2 || keys.get(1025) !== 1 || keys.get(2054) !== 9102)
    throw new Error(
      "Requires explicit geographic angular degrees and PixelIsArea; reproject explicitly from reviewed lunar SRS first",
    );
  if (keys.has(2050) && keys.get(2050) !== 32767)
    throw new Error("Unreviewed/Earth geodetic datum rejected");
  if (keys.get(2048) !== 32767)
    throw new Error(
      "Requires user-defined lunar geographic CRS; Earth EPSG codes are rejected",
    );
  if (!/moon|lunar/i.test(citation))
    throw new Error("Lunar CRS citation required");
  const west = tie[3] - tie[0] * scale[0],
    north = tie[4] + tie[1] * scale[1];
  if (
    Math.abs(scale[0] - 0.125) > 1e-9 ||
    Math.abs(scale[1] - 0.125) > 1e-9 ||
    Math.abs(west + 180) > 1e-6 ||
    Math.abs(north - 90) > 1e-6
  )
    throw new Error(
      "Registration must be north-up, west −180°, north +90°, 0.125°/pixel",
    );
  return {
    productId: "WAC_GLOBAL_E000N0000_008P",
    width,
    height,
    bits: 8,
    projection: "Geographic lunar longitude/latitude (equirectangular display)",
    bounds: { north: 90, south: -90, west: -180, east: 180 },
    orientation: "north up; longitude increases east; seam at ±180°",
    pixelIsArea: true,
    citation,
    degreesPerPixel: 0.125,
    limitation:
      "8 px/degree imagery only; no elevation or close-up terrain detail",
  };
}
