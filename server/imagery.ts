import { readFile, stat } from "node:fs/promises";
export async function lunarImagery(root: string) {
  try {
    const file = root + "/textures/lroc-moon.json";
    if ((await stat(file)).size > 50000) throw new Error("Manifest too large");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    if (
      manifest.state !== "available" ||
      manifest.url !== "/textures/lroc-moon.jpg" ||
      manifest.metadata?.productId !== "WAC_GLOBAL_E000N0000_008P" ||
      manifest.metadata.width !== 2880 ||
      manifest.metadata.height !== 1440 ||
      manifest.source?.registrationChecked !== true ||
      manifest.source?.sourceUrl !==
        "https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P" ||
      typeof manifest.source?.retrievedAt !== "string" ||
      !Number.isFinite(Date.parse(manifest.source.retrievedAt)) ||
      !/^[a-f0-9]{64}$/.test(manifest.sourceSha256) ||
      !/^[a-f0-9]{64}$/.test(manifest.sha256)
    )
      throw new Error("Invalid WAC manifest");
    const image = await readFile(root + manifest.url);
    if (image.byteLength > 5000000)
      throw new Error("Imported display image too large");
    const { createHash } = await import("node:crypto");
    if (createHash("sha256").update(image).digest("hex") !== manifest.sha256)
      throw new Error("Display image checksum mismatch");
    return manifest;
  } catch {
    return {
      state: "unavailable",
      url: "/textures/moon.jpg",
      reason:
        "Requested LROC WAC product not imported. Showing the explicitly labeled legacy qualitative map.",
      productId: "WAC_GLOBAL_E000N0000_008P",
      sourceUrl:
        "https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P",
    };
  }
}
