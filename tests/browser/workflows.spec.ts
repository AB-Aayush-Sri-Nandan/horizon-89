import { test, expect } from "@playwright/test";
test("actual landing globe, mission workflow, time controls, science, atlas and missing AI key", async ({
  page,
}) => {
  const exceptions: string[] = [];
  const unexpectedResources: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (
      response.status() >= 400 &&
      !["/api/horizons", "/api/copilot"].includes(url.pathname)
    )
      unexpectedResources.push(`${response.status()} ${url.pathname}`);
  });
  page.on("pageerror", (error) => exceptions.push(error.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  const stats = await canvas.evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext("webgl2");
    if (!gl) throw new Error("WebGL2 unavailable");
    const buffer = new Uint8Array(4);
    gl.readPixels(
      gl.drawingBufferWidth / 2,
      gl.drawingBufferHeight / 2,
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      buffer,
    );
    return {
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      pixel: Array.from(buffer),
    };
  });
  expect(stats.width).toBeGreaterThan(200);
  expect(stats.height).toBeGreaterThan(200);
  expect(stats.pixel.slice(0, 3).some((v) => v > 30)).toBe(true);
  // Image detail must reach the GPU; a merely visible gray sphere is insufficient.
  await expect
    .poll(() =>
      canvas.evaluate((element) => {
        const gl = (element as HTMLCanvasElement).getContext("webgl2")!;
        const buffer = new Uint8Array(180 * 4);
        gl.readPixels(
          Math.floor(gl.drawingBufferWidth / 2) - 90,
          Math.floor(gl.drawingBufferHeight / 2),
          180,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          buffer,
        );
        let details = 0;
        for (let i = 4; i < buffer.length; i += 4)
          if (Math.abs(buffer[i] - buffer[i - 4]) > 4) details++;
        return details;
      }),
    )
    .toBeGreaterThan(12);
  await page.getByRole("button", { name: "Toggle coordinate grid" }).click();
  await expect(
    page.getByRole("button", { name: "Toggle coordinate grid" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Focus 89 degrees south" }).click();
  await page.getByRole("button", { name: "Reset camera" }).click();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("No canvas");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55, {
    steps: 10,
  });
  await page.mouse.up();
  await page.mouse.wheel(0, -150);
  await canvas.dblclick({
    position: { x: box.width * 0.5, y: box.height * 0.5 },
  });
  await page.getByRole("button", { name: "Focus 89 degrees south" }).click();
  await page.getByRole("textbox", { name: "Search missions" }).fill("Odysseus");
  await expect(
    page.getByRole("button", { name: /IM-1 · Odysseus/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Blue Ghost Mission 1/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /IM-1 · Odysseus/ }).click();
  await expect(
    page.getByRole("button", { name: "Focus selected target" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Coordinates unverified", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search missions" }).fill("");
  await page
    .getByRole("combobox", { name: "Filter mission provider" })
    .selectOption("Astrobotic");
  await expect(
    page.getByRole("button", { name: /Peregrine Mission One/ }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter mission provider" })
    .selectOption("all");
  await page
    .getByRole("spinbutton", { name: "Latitude", exact: true })
    .fill("-89");
  await page
    .getByRole("spinbutton", { name: "Longitude", exact: true })
    .fill("12");
  await page.getByRole("button", { name: "Apply target" }).click();
  await expect(page.getByText("89.000°S / 12.000°E").first()).toBeVisible();
  await page.getByLabel("Playback speed").selectOption("600");
  const before = await page.getByTestId("simulation-time").textContent();
  await page.getByRole("button", { name: "Play timeline" }).click();
  await expect
    .poll(() => page.getByTestId("simulation-time").textContent())
    .not.toBe(before);
  await page.getByRole("button", { name: "Pause timeline" }).click();
  await page.getByLabel("SIMULATION TIME / UTC").fill("800");
  await expect(page.getByTestId("simulation-time")).toHaveText("13:20:00");
  await page
    .getByRole("button", { name: "Lunar science", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Filter datasets" })
    .selectOption("missing");
  await expect(
    page.getByRole("heading", { name: "LOLA topography & slope" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Lunar global image map" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "CLPS intelligence", exact: true })
    .click();
  await expect(
    page.getByRole("table", { name: "CLPS historical mission comparison" }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Blue Ghost Mission 1" })
    .getByRole("button", { name: "Select" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Mission Copilot/ }).click();
  await page.getByLabel("Ask Copilot").fill("What datasets are missing?");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("alert")).toContainText("GROQ_API_KEY");
  await page.getByRole("button", { name: "Close Copilot" }).click();
  await page.getByRole("button", { name: "Solar System", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The Solar System." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Saturn", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Saturn", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play orbits" }).click();
  await expect(page.getByText("SCHEMATIC DAY 0", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Pause orbits" }).click();
  await page.getByRole("button", { name: "Reset atlas" }).click();
  await expect(
    page.getByText("SCHEMATIC DAY 0", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  expect(exceptions).toEqual([]);
  expect(unexpectedResources).toEqual([]);
  await page.screenshot({ path: "test-results/mission-control.png", fullPage: true });
});
test("mobile navigation, no horizontal overflow, manual fields, command search and texture failure fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("button", { name: "Apply target" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Graphics quality" })
    .selectOption("low");
  await page.getByRole("button", { name: "Open commands" }).click();
  await page.getByLabel("Navigate workspace").fill("Solar");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Solar System", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "The Solar System." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.route("**/textures/moon.jpg", (route) => route.abort());
  await page.reload();
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(
    page.getByText("Texture unavailable · untextured sphere fallback"),
  ).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  await page.unroute("**/textures/moon.jpg");
  await page.getByRole("button", { name: "Reload viewer" }).click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
});

test("telemetry source contract, stale-response rejection and day-end playback", async ({
  page,
}) => {
  // Contract fixture only. These numbers are not a remote science validation.
  let mismatch = false;
  await page.route("**/api/horizons?**", async (route) => {
    const url = new URL(route.request().url());
    const timeUTC = url.searchParams.get("time");
    const body = {
      azimuthDegrees: 123,
      elevationDegrees: -2,
      geometricallyAboveHorizon: false,
      terrainVisibilityEvaluated: false,
    };
    await route.fulfill({
      json: {
        source: "TEST CONTRACT FIXTURE",
        sourceUrl: "https://example.invalid",
        dataType: "calculated",
        status: "available",
        lunarSite: {
          latitude: mismatch ? 0 : Number(url.searchParams.get("lat")),
          longitude: Number(url.searchParams.get("lon")),
        },
        timeUTC,
        fetchedAt: "2025-03-02T06:00:00.000Z",
        cached: false,
        frame: "test",
        sun: body,
        earth: body,
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(
    page.getByText("TEST CONTRACT FIXTURE", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.getByText("-2.00").first()).toBeVisible();
  mismatch = true;
  await page.getByRole("button", { name: "Retry geometry request" }).click();
  await expect(
    page.getByText("Observer response does not match this site and time."),
  ).toBeVisible();
  await expect(page.getByText("-2.00")).toHaveCount(0);
  await page.getByLabel("SIMULATION TIME / UTC").fill("1439");
  await expect(page.getByText("DAY COMPLETE")).toBeVisible();
  await page.getByRole("button", { name: "Play timeline" }).click();
  await expect(
    page.getByRole("button", { name: "Pause timeline" }),
  ).toBeVisible();
  await expect(page.getByTestId("simulation-time")).not.toHaveText("23:59:00");
  await page.getByRole("button", { name: "Pause timeline" }).click();
});

test("tablet layout and recovery from WebGL context loss", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("canvas").evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext("webgl2");
    const extension = gl?.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("Context loss test extension unavailable");
    extension.loseContext();
  });
  await expect(
    page.getByText("WebGL context lost · reload viewer to restore"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reload viewer" }).click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
});
