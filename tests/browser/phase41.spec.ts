import { test, expect } from "@playwright/test";
import { SphereGeometry } from "three";
// Synthetic render fixture only: never shipped as Mercury or used as scientific data.
function fixtureGLB() {
  const geometry = new SphereGeometry(20, 12, 8);
  const position = geometry.getAttribute("position").array;
  const normal = geometry.getAttribute("normal").array;
  const index = geometry.index!.array;
  const buffers = [
    Buffer.from(position.buffer),
    Buffer.from(normal.buffer),
    Buffer.from(index.buffer),
  ];
  const binary = Buffer.concat(buffers);
  const json = Buffer.from(
    JSON.stringify({
      asset: { version: "2.0" },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [
        {
          primitives: [
            { attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 },
          ],
        },
      ],
      materials: [
        {
          pbrMetallicRoughness: {
            baseColorFactor: [0.6, 0.5, 0.4, 1],
            metallicFactor: 0,
            roughnessFactor: 1,
          },
        },
      ],
      buffers: [{ byteLength: binary.length }],
      bufferViews: buffers.map((b, i) => ({
        buffer: 0,
        byteOffset: buffers.slice(0, i).reduce((n, b) => n + b.length, 0),
        byteLength: b.length,
      })),
      accessors: [
        {
          bufferView: 0,
          componentType: 5126,
          count: position.length / 3,
          type: "VEC3",
          min: [-20, -20, -20],
          max: [20, 20, 20],
        },
        {
          bufferView: 1,
          componentType: 5126,
          count: normal.length / 3,
          type: "VEC3",
        },
        {
          bufferView: 2,
          componentType: 5123,
          count: index.length,
          type: "SCALAR",
        },
      ],
    }),
  );
  const jsonLength = Math.ceil(json.length / 4) * 4,
    binLength = Math.ceil(binary.length / 4) * 4;
  const out = Buffer.alloc(12 + 8 + jsonLength + 8 + binLength);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonLength, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  out.fill(32, 20, 20 + jsonLength);
  json.copy(out, 20);
  out.writeUInt32LE(binLength, 20 + jsonLength);
  out.writeUInt32LE(0x004e4942, 24 + jsonLength);
  binary.copy(out, 28 + jsonLength);
  geometry.dispose();
  return out;
}
test("homepage CTAs, local NASA image and return home retain lunar navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const missing: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("/api/horizons"))
      missing.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Beyond Earth. Into the Unknown." }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".space-image")
        .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth),
    )
    .toBe(2560);
  await page.getByRole("button", { name: "Discover Lunar Missions" }).click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
  await page.getByLabel("SIMULATION TIME / UTC").fill("800");
  await page.getByRole("link", { name: "HORIZON 89 home" }).click();
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await expect(
    page.getByRole("heading", { name: "The Solar System." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Earth", exact: true }).click();
  await page.getByRole("button", { name: "Play orbits" }).click();
  await expect
    .poll(() => page.locator(".solar-controls .mono").innerText())
    .not.toBe("SCHEMATIC DAY 0");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hiddenDay = await page.locator(".solar-controls .mono").innerText();
  await page.waitForTimeout(600);
  await expect(page.locator(".solar-controls .mono")).toHaveText(hiddenDay);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.locator(".solar-controls .mono").innerText())
    .not.toBe(hiddenDay);
  await page.getByRole("button", { name: "Pause orbits" }).click();
  const day = await page.locator(".solar-controls .mono").innerText();
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(page.getByTestId("simulation-time")).toHaveText("13:20:00");
  await page.getByRole("button", { name: /Back to Solar System/ }).click();
  await expect(
    page.getByRole("button", { name: "Earth", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".solar-controls .mono")).toHaveText(day);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
  await page.getByRole("link", { name: "HORIZON 89 home" }).click();
  await page.screenshot({
    path: "docs/phase41-home.png",
    fullPage: true,
    animations: "disabled",
  });
});
test("mobile homepage image failure, reduced motion and WebGL fallback remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/images/tycho-starfield.jpg", (r) => r.abort());
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Beyond Earth. Into the Unknown." }),
  ).toBeVisible();
  await expect(page.locator(".space-image")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/phase41-mobile-fallback.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await expect(
    page.getByRole("button", { name: "Play orbits" }),
  ).toBeDisabled();
  await expect(page.getByText("3D rendering unavailable")).toBeVisible();
  await page
    .getByRole("button", { name: "Open lunar Mission Control" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
});
test("Mercury GLB pipeline renders a synthetic contract fixture and handles parse failure", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/models/mercury", (r) =>
    r.fulfill({ json: { available: true, url: "/api/models/mercury.glb" } }),
  );
  await page.route("**/api/models/mercury.glb", (r) =>
    r.fulfill({ body: fixtureGLB(), contentType: "model/gltf-binary" }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await page.getByRole("button", { name: "Mercury", exact: true }).click();
  await expect(
    page.getByText(
      "Local GLB model loaded · orientation/provenance unverified",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play orbits" }).click();
  await page.screenshot({
    path: "test-results/mercury-synthetic-contract.png",
  });
  expect(errors).toEqual([]);
  await page.unroute("**/api/models/mercury.glb");
  await page.route("**/api/models/mercury.glb", (r) =>
    r.fulfill({ body: "broken glb", contentType: "model/gltf-binary" }),
  );
  await page.reload();
  await expect(page).toHaveURL(/#solar$/);
  await page.getByRole("button", { name: "Mercury", exact: true }).click();
  await expect(
    page.getByText("Local GLB unavailable · untextured fallback"),
  ).toBeVisible();
});
