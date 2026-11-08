import { useState } from "react";
const commands = `mkdir -p .data/lola
# Upload your reviewed .lbl, .img and provenance.json into .data/lola using the file explorer.
npm run science:inspect -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json
# Only after successful inspection and independent source/pixel checks:
npm run science:ingest -- .data/lola/PRODUCT.lbl .data/lola/PRODUCT.img .data/lola/provenance.json public/science/terrain.json
npm run build
npm start`;
export default function ImportGuide() {
  const [feedback, setFeedback] = useState("");
  return (
    <details className="import-guide">
      <summary>Import a reviewed local DEM · operator guide</summary>
      <ol>
        <li>
          <strong>Obtain and review the source.</strong> Use an authoritative
          PDS/LOLA product. Verify units, spherical radius/datum, projection,
          east-positive coordinates, coverage, no-data and license. This release
          supports only the documented detached PDS3 subset.
        </li>
        <li>
          <strong>Upload files, not browser memory.</strong> Place the detached
          label/image and reviewed provenance JSON in ignored{" "}
          <code>.data/lola/</code> using Codespaces Explorer → Upload. Raw files
          never enter the browser bundle or Git.
        </li>
        <li>
          <strong>Record retrieval honestly.</strong> Include productId, source
          and label HTTPS URLs, actual <code>retrievedAt</code> ending in Z,
          datumDescription, license, attribution and the publisher SHA-256 if
          supplied. A locally computed hash is not publisher authentication.
        </li>
        <li>
          <strong>Inspect before processing.</strong> The command below
          validates metadata, byte count and checksum without generating
          terrain. It does not establish scientific suitability; independently
          compare source pixels and registration.
        </li>
        <li>
          <strong>Convert and restart.</strong> After independent checks,
          generate the bounded artifact, rebuild and restart. Reload this page
          to refresh inventory. Elevation and slope controls become available
          only for accepted data. Shadow, ice and communications remain
          unsupported.
        </li>
      </ol>
      <pre tabIndex={0} aria-label="Manual DEM import commands">
        {commands}
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(commands);
            setFeedback(
              "Import commands copied. Replace PRODUCT with the reviewed filenames.",
            );
          } catch {
            setFeedback(
              "Clipboard unavailable. Select and copy the commands above.",
            );
          }
        }}
      >
        Copy import commands
      </button>
      <p role="status">{feedback}</p>
      <p>
        No real LOLA product has been processed in this environment. A complete
        input template and supported-format details are in{" "}
        <code>docs/science/provenance.example.json</code> and{" "}
        <code>docs/science/INGESTION.md</code> in the repository.
      </p>
    </details>
  );
}
