import { test, expect } from "@playwright/test";
test("real inventory gaps and evidence comparison remain honest and usable", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Lunar science", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Elevation layer" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Permanent shadow layer" }),
  ).toBeDisabled();
  await expect(
    page.getByText("No reviewed DEM has been imported.", { exact: false }),
  ).toBeVisible();
  await page
    .getByText("Illumination and shadow evidence", { exact: true })
    .click();
  await expect(
    page.getByText("No validated PSR mask", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "CLPS intelligence", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Comparison location B" })
    .selectOption("blue-ghost");
  const table = page.getByRole("region", {
    name: "Landing site evidence comparison",
  });
  await expect(
    table.getByRole("columnheader", { name: "Blue Ghost Mission 1" }),
  ).toBeVisible();
  await expect(table.getByText("Exact coordinates not verified")).toBeVisible();
  await expect(
    table.getByText("Unavailable — no valid DEM sample"),
  ).toHaveCount(2);
  await page.screenshot({ path: "test-results/phase2-comparison.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("terrain UI and GPU color overlay consume validated contract data only (synthetic test fixture)", async ({
  page,
}) => {
  // Small synthetic fixture for visualization plumbing. Not a public scientific product.
  const tile = {
    version: 1,
    metadata: {
      productId: "SYNTHETIC_BROWSER_TEST_ONLY",
      target: "MOON",
      projection: "POLAR_STEREOGRAPHIC",
      width: 5,
      height: 5,
      sampleBits: 16,
      sampleType: "LSB_INTEGER",
      scale: 1,
      offset: 0,
      noData: -32768,
      unit: "m",
      radiusM: 1737400,
      mapScaleM: 100,
      centerLatitude: -90,
      centerLongitude: 0,
      lineOffset: 2,
      sampleOffset: 2,
      longitudeDirection: "EAST",
      latitudeType: "PLANETOCENTRIC",
      epoch: "2020-01-01T00:00:00Z",
    },
    source: {
      url: "https://example.invalid/test-only.img",
      labelUrl: "https://example.invalid/test-only.lbl",
      retrievedAt: "2026-11-08T00:00:00Z",
      labelSha256: "a".repeat(64),
      imageSha256: "b".repeat(64),
      integrity: "local-sha256-only",
      attribution: "SYNTHETIC TEST ONLY",
      license: "TEST ONLY",
      verticalDatum: "Synthetic datum, not lunar science",
    },
    bounds: { north: -80, south: -90, west: -180, east: 180 },
    width: 3,
    height: 3,
    elevations: [1, 2, 3, 4, null, 6, 7, 8, 9],
    slopes: [1, 2, 3, 4, null, 6, 7, 8, 9],
    sampling: "nearest source pixel",
    slopeMethod: "Test-only fixture",
  };
  await page.route("**/api/science", (route) =>
    route.fulfill({ json: { state: "available", tile, reason: null } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Lunar science", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Elevation layer" }).check();
  await expect(
    page.getByRole("checkbox", { name: "Slope layer" }),
  ).toBeEnabled();
  await page.getByRole("checkbox", { name: "Slope layer" }).check();
  await expect(
    page.getByRole("heading", { name: "Imported lunar DEM" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Illumination layer" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Inspect 89°S" }).click();
  await expect(
    page.getByText("DEM SLOPE (°) · COLOR OVERLAY · NO DISPLACEMENT"),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page
    .getByRole("button", { name: "Lunar science", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Slope layer" }).uncheck();
  await page.getByRole("checkbox", { name: "Elevation layer" }).uncheck();
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(
    page.getByText("DEM SLOPE (°) · COLOR OVERLAY · NO DISPLACEMENT"),
  ).toHaveCount(0);
});
