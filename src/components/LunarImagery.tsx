export interface LunarImage {
  state: "available" | "unavailable";
  url: string;
  reason?: string;
  metadata?: {
    productId: string;
    orientation: string;
    degreesPerPixel: number;
  };
  source?: { sourceUrl: string; retrievedAt: string };
  sourceSha256?: string;
}
export function LunarImageryDetails({ image }: { image: LunarImage }) {
  return (
    <details className="lunar-imagery-details">
      <summary>Moon imagery provenance / LROC import</summary>
      <p>
        {image.state === "available"
          ? `${image.metadata?.productId} · 8 pixels/degree · ${image.metadata?.orientation}. Source SHA-256: ${image.sourceSha256}`
          : image.reason}
      </p>
      <a
        href="https://data.lroc.im-ldi.com/lroc/view_rdr_product/WAC_GLOBAL_E000N0000_008P"
        target="_blank"
        rel="noreferrer"
      >
        Requested LROC WAC product ↗
      </a>
      <p>
        Neither image texture is elevation. This 8 px/degree candidate is global
        context, not close-up terrain detail. Exact manual TIFF download,
        metadata inspection and import steps:{" "}
        <code>docs/science/LROC-IMAGERY.md</code>.
      </p>
    </details>
  );
}
