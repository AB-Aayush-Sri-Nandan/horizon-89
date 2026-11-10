import { test, expect } from "@playwright/test";
test("Solar entry, sourced planet selection, smooth Moon fly-in and preserved lunar round trip", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await expect(
    page.getByRole("heading", { name: "The Solar System." }),
  ).toBeVisible();
  await expect(
    page.getByText("NOT TO SCALE · SCHEMATIC ORBITS · NOT LIVE POSITIONS"),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.getByRole("button", { name: "Earth", exact: true }).click();
  await expect(
    page.getByText("NASA map loaded", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Solar graphics quality" })
    .selectOption("high");
  await page
    .getByRole("combobox", { name: "Solar graphics quality" })
    .selectOption("medium");
  await page.getByRole("button", { name: "Mercury", exact: true }).click();
  await expect(
    page.getByText("Untextured fallback · no reviewed Mercury map available"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Venus", exact: true }).click();
  await page.getByLabel("Show false-color surface (not clouds)").check();
  await expect(
    page.getByText("NASA map loaded", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Moon", exact: true }).click();
  await expect(
    page.getByText("Approaching lunar Mission Control"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByRole("progressbar", { name: "Moon fly-in progress" })
        .getAttribute("value"),
    )
    .not.toBe("0");
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  await expect(
    page.getByText("Legacy qualitative image · requested LROC unavailable"),
  ).toBeVisible();
  await page.getByLabel("SIMULATION TIME / UTC").fill("800");
  await page
    .getByRole("button", { name: "Back to Solar System", exact: false })
    .click();
  await expect(
    page.getByRole("button", { name: "Moon", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Enter lunar Mission Control ↗" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
  await expect(page.getByTestId("simulation-time")).toHaveText("13:20:00");
  expect(
    await page.evaluate(
      () => performance.getEntriesByType("navigation").length,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Back to Solar System", exact: false })
    .click();
  await page.getByRole("button", { name: "Reset atlas" }).click();
  await expect(
    page.getByRole("heading", { name: "Sun", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/phase4-solar.png", fullPage: true });
});
test("planet texture failure and mobile/reduced-motion entry remain navigable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/textures/planets/earth.jpg", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await page.getByRole("button", { name: "Earth", exact: true }).click();
  await expect(
    page.getByText("Image unavailable · untextured fallback"),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Solar graphics quality" })
    .selectOption("low");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "test-results/phase4-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Moon", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Mission Copilot/ }).click();
  await page
    .getByLabel("Ask Copilot")
    .fill("Explain the available source evidence");
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.getByRole("alert")).toContainText("H89_AI_API_KEY");
});

test("real Copilot response only when a server key is configured", async ({
  page,
  request,
}) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(
    !health.copilotConfigured,
    "No H89_AI_API_KEY configured; real response workflow not executed.",
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await page.getByRole("button", { name: /Mission Copilot/ }).click();
  await page
    .getByLabel("Ask Copilot")
    .fill(
      "Explain the difference between flat-horizon visibility and terrain line of sight using the available project context. Do not invent measurements.",
    );
  await page.getByRole("button", { name: "Send question" }).click();
  await expect(page.locator(".chat.assistant")).toBeVisible({ timeout: 25000 });
  await expect(page.locator(".chat.assistant")).toContainText("AI GENERATED");
});
