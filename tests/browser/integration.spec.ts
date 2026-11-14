import { test, expect } from "@playwright/test";

const classic = [
  ["home", "Explore", "BEYOND EARTH."],
  ["solar", "Solar system", "Eight worlds."],
  ["moon", "Moon explorer", "Explore the Moon"],
  ["missions", "Missions", "Every mission begins with a question."],
  ["lab", "Landing Lab", "Explore the unknown."],
  ["graph", "Knowledge Graph", "Follow the"],
  ["control", "Operations overview", "Mission control."],
  ["copilot", "Horizon Intelligence", "Horizon Intelligence"],
] as const;
const platform = [
  ["platform-home", "Home", "Beyond Earth. Into the Unknown."],
  ["mission-control", "Mission control", "Mission control."],
  ["lunar-science", "Lunar science", "Explore the edge of light."],
  ["clps-intelligence", "CLPS intelligence", "Small landers. Big questions."],
  ["solar-atlas", "Solar System", "The Solar System."],
] as const;

test("all mission-platform and research navigation entries open real pages", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/");
  for (const [hash, label, heading] of platform) {
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
  for (const [hash, label, heading] of classic) {
    await page.getByRole("navigation", { name: "Research workspaces" }).getByRole("button", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
  await expect(page.locator(".h89-ai")).toBeVisible();
});

test("all original deep links survive direct load, refresh, and history navigation", async ({ page }) => {
  test.setTimeout(120000);
  for (const [hash, , heading] of classic) {
    await page.goto(`/#${hash}`);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/#control$/);
  await expect(page.getByText("SYSTEM OVERVIEW")).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/#copilot$/);
  await expect(page.getByRole("heading", { name: "Horizon Intelligence" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Skip to main content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#copilot$/);
  await expect(page.locator("#main-content")).toBeFocused();
});

test("mission-platform hashes load directly and keep their pages after refresh", async ({ page }) => {
  test.setTimeout(90000);
  for (const [hash, , heading] of platform) {
    await page.goto(`/#${hash}`);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
});

test("prior research aliases and cross-workspace browser history still resolve", async ({ page }) => {
  await page.goto("/#research-missions");
  await expect(page.getByRole("heading", { name: "Every mission begins with a question." })).toBeVisible();
  await page.goto("/#solar-overview");
  await expect(page.getByRole("heading", { name: "Eight worlds.", exact: false })).toBeVisible();
  await page.goto("/#solar-atlas");
  await page.getByRole("navigation", { name: "Research workspaces" }).getByRole("button", { name: "Solar system", exact: true }).click();
  await expect(page).toHaveURL(/#solar$/);
  await page.goBack();
  await expect(page).toHaveURL(/#solar-atlas$/);
  await page.goForward();
  await expect(page).toHaveURL(/#solar$/);
});

test("original Home preview and Operations overview retain their working actions", async ({ page }) => {
  await page.goto("/#home");
  await expect(page.locator(".hero-scene canvas")).toBeVisible();
  await page.getByRole("button", { name: /The Moon/ }).click();
  await expect(page).toHaveURL(/#moon$/);
  await page.goto("/#control");
  await expect(page.getByText("SYSTEM OVERVIEW")).toBeVisible();
  await expect(page.getByText("ONLINE", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /INSPECT DATA COVERAGE/ }).click();
  await expect(page).toHaveURL(/#lab$/);
});

for (const width of [1440, 800, 390]) {
  test(`integrated workspaces remain navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    test.setTimeout(120000);
    for (const [hash, label, heading] of [...classic, ...platform]) {
      await page.goto(`/#${hash}`);
      await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
      const navigation = platform.some(([id]) => id === hash) ? "Primary navigation" : "Research workspaces";
      await expect(page.getByRole("navigation", { name: navigation }).getByRole("button", { name: label, exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  });
}

test("dedicated Copilot creates and clears a temporary server session", async ({ page }) => {
  await page.goto("/#copilot");
  await page.getByRole("button", { name: "Configure temporary API key" }).click();
  await page.getByLabel("API key", { exact: true }).fill("test-session-key-123");
  await page.getByRole("button", { name: "Save for this session" }).click();
  await expect(page.getByText("Credential saved in server memory for this session.")).toBeVisible();
  await page.getByRole("button", { name: "Close settings" }).click();
  await page.reload();
  await expect(page.getByText("OPENAI KEY STORED")).toBeVisible();
  await page.getByLabel("Ask Horizon Intelligence").fill("What verified landing evidence is available?");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByText("No verified source records match this question yet.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Open API key settings" }).click();
  await page.getByRole("button", { name: "Clear credential" }).click();
  await expect(page.getByText("Credential cleared from server memory.")).toBeVisible();
});

test("original research links carry context into Copilot and the Moon explorer", async ({ page }) => {
  await page.goto("/#missions");
  const card = page.locator(".hm-missions__card").first();
  const name = await card.locator("h2").innerText();
  await card.getByRole("button", { name: "Inspect record" }).click();
  await page.getByRole("button", { name: "Ask Horizon Intelligence" }).click();
  await expect(page).toHaveURL(/#copilot$/);
  await expect(page.locator(".h89-ai-contextitem").filter({ hasText: "MISSION" })).toContainText(name);
  await page.goto("/#solar");
  await page.getByRole("button", { name: "EXPLORE THE MOON" }).click();
  await expect(page).toHaveURL(/#moon$/);
  await expect(page.getByRole("heading", { name: "Explore the Moon" })).toBeVisible();
});
