import { test, expect } from "@playwright/test";

const research = [
  ["moon", "Moon explorer", "Explore the Moon"],
  ["lab", "Landing Lab", "Explore the unknown."],
  ["graph", "Knowledge Graph", "Follow the"],
  ["copilot", "Horizon Intelligence", "Horizon Intelligence"],
] as const;
const additional = [
  ["research-missions", "Research leads", "Every mission begins with a question."],
  ["solar-overview", "Solar overview", "Eight worlds."],
] as const;

test("all mission-platform and research navigation entries open real pages", async ({ page }) => {
  await page.goto("/");
  for (const [label, heading] of [
    ["Mission control", "Mission control."],
    ["Lunar science", "Explore the edge of light."],
    ["CLPS intelligence", "Small landers. Big questions."],
    ["Solar System", "The Solar System."],
  ]) {
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: label }).click();
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
  for (const [hash, label, heading] of [...research, ...additional]) {
    await page.getByRole("navigation", { name: "Research workspaces" }).getByRole("button", { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${hash}$`));
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Home" }).click();
  await expect(page.getByRole("heading", { name: "Beyond Earth. Into the Unknown." })).toBeVisible();
});

test("all original deep links survive direct load, refresh, and history navigation", async ({ page }) => {
  for (const [hash, , heading] of research) {
    await page.goto(`/#${hash}`);
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
  }
  await page.goBack();
  await expect(page).toHaveURL(/#graph$/);
  await expect(page.getByRole("heading", { name: "Follow the", exact: false }).first()).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/#copilot$/);
  await expect(page.getByRole("heading", { name: "Horizon Intelligence" }).first()).toBeVisible();
  await page.getByRole("link", { name: "Skip to main content" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#copilot$/);
  await expect(page.locator("#main-content")).toBeFocused();
});

for (const width of [1440, 800, 390]) {
  test(`integrated workspaces remain navigable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [hash, label, heading] of [...research, ...additional]) {
      await page.goto(`/#${hash}`);
      await expect(page.getByRole("heading", { name: heading, exact: false }).first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Research workspaces" }).getByRole("button", { name: label })).toBeVisible();
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
  await page.goto("/#research-missions");
  const card = page.locator(".hm-missions__card").first();
  const name = await card.locator("h2").innerText();
  await card.getByRole("button", { name: "Inspect record" }).click();
  await page.getByRole("button", { name: "Ask Horizon Intelligence" }).click();
  await expect(page).toHaveURL(/#copilot$/);
  await expect(page.locator(".h89-ai-contextitem").filter({ hasText: "MISSION" })).toContainText(name);
  await page.goto("/#solar-overview");
  await page.getByRole("button", { name: "EXPLORE THE MOON" }).click();
  await expect(page).toHaveURL(/#moon$/);
  await expect(page.getByRole("heading", { name: "Explore the Moon" })).toBeVisible();
});
