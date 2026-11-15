import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`final judge journey ${viewport.width}px: exploration, evidence, keyboard and return`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [],
      missing: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400 && !/\/api\/(horizons|copilot)/.test(r.url()))
        missing.push(r.url());
    });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Beyond Earth. Into the Unknown." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Explore Universe" }).click();
    await expect(page.locator("#main-content")).toBeFocused();
    for (const name of ["Jupiter", "Mercury", "Earth"]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(
        page.getByRole("heading", { name, exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "Moon", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Mission control." }),
    ).toBeVisible();
    await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
    await page.getByRole("button", { name: "Zoom in Moon" }).click();
    await page.getByRole("button", { name: "Zoom out Moon" }).click();
    await page
      .getByRole("button", { name: "Reset camera", exact: true })
      .click();
    await page.getByRole("button", { name: "Toggle coordinate grid" }).click();
    await page.getByRole("button", { name: "Focus 89 degrees south" }).click();
    await page.getByRole("button", { name: /IM-1.*Odysseus/ }).click();
    await expect(
      page
        .getByRole("heading", { name: "IM-1 · Odysseus", exact: true })
        .first(),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "CLPS intelligence", exact: true })
      .click();
    await expect(
      page.getByRole("table", { name: "CLPS historical mission comparison" }),
    ).toContainText("Blue Ghost Mission 1");
    await page.getByLabel("Comparison location A").selectOption("im1");
    await page.getByLabel("Comparison location B").selectOption("blue-ghost");
    await expect(
      page.getByRole("table", { name: /Evidence at requested UTC/ }),
    ).toContainText("Exact coordinates not verified");
    await page
      .getByRole("button", { name: "Mission control", exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "Latitude", exact: true })
      .fill("-88.5");
    await page
      .getByRole("spinbutton", { name: "Longitude", exact: true })
      .fill("12.25");
    await page.getByRole("button", { name: "Apply target" }).click();
    await expect(
      page.getByText("Study target applied.", { exact: false }),
    ).toBeVisible();
    await page.getByLabel("Simulation date").fill("2025-03-02");
    await page.getByLabel("SIMULATION TIME / UTC").fill("800");
    await expect(page.getByTestId("simulation-time")).toHaveText("13:20:00");
    await page.getByRole("button", { name: "Play timeline" }).click();
    await expect(page.getByTestId("simulation-time")).not.toHaveText(
      "13:20:00",
    );
    await page.getByRole("button", { name: "Pause timeline" }).click();
    await page
      .getByText("Source & measurement limits", { exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "JPL Horizons documentation" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Lunar science", exact: true })
      .click();
    await expect(
      page.getByText("No reviewed DEM", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Mission Copilot", exact: true })
      .click();
    await expect(
      page.getByText("Copilot is not configured.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByLabel("Ask Copilot")).toBeFocused();
    await page
      .getByLabel("Ask Copilot")
      .fill("Which source observations are missing?");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.getByRole("alert")).toContainText("GROQ_API_KEY");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Mission Copilot", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Mission control", exact: true })
      .click();
    await page.getByRole("button", { name: /Back to Solar System/ }).click();
    await expect(
      page.getByRole("button", { name: "Moon", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "HORIZON 89 home" }).click();
    await expect(
      page.getByRole("heading", { name: "Beyond Earth. Into the Unknown." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => performance.getEntriesByType("navigation").length,
      ),
    ).toBe(1);
    expect(errors).toEqual([]);
    expect(missing).toEqual([]);
    await page.screenshot({
      path: `test-results/final-home-${viewport.width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
}

test("Solar context loss stops animation, preserves directory navigation and can be reloaded", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    canvas
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context")!
      .loseContext();
  });
  await expect(
    page.getByRole("heading", { name: "3D rendering unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play orbits" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Earth", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Earth", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reload Solar viewer" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(
    page.getByText("NASA map loaded", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Moon", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
});

test("Moon selection without WebGL opens the workspace instead of trapping a camera flight", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explore Universe" }).click();
  await expect(
    page.getByRole("heading", { name: "3D rendering unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Moon", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mission control." }),
  ).toBeVisible();
});
