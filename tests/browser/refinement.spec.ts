import { test, expect } from '@playwright/test';

test('sourced Earth hero and Solar fullscreen preserve scene controls', async ({ page }) => {
  await page.goto('/#platform-home');
  await expect(page.getByRole('heading', { name: 'Beyond Earth. Into the Unknown.' })).toBeVisible();
  await expect(page.locator('.home-earth')).toHaveCSS('background-image', /earth\.jpg/);
  await page.screenshot({ path: 'docs/refinement-home-desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Explore Universe' }).click();
  await expect(page.getByRole('heading', { name: 'The Solar System.' })).toBeVisible();
  await expect(page.locator('.solar-stage canvas')).toBeVisible();
  await expect(page.locator('.texture-status')).not.toHaveText('Preparing scene…');
  await page.screenshot({ path: 'docs/refinement-solar-desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Fullscreen scene' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.getByLabel('Fullscreen destination').selectOption('Earth');
  await expect(page.getByLabel('Fullscreen destination')).toHaveValue('Earth');
  await page.getByRole('button', { name: 'Exit fullscreen' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(false);
});

test('lunar image state is honest and mission cards have distinct illustrative identities', async ({ page }) => {
  await page.goto('/#moon');
  await expect(page.getByRole('heading', { name: 'Explore the Moon' })).toBeVisible();
  await expect(page.getByRole('button', { name: /LROC WAC global mosaic/ })).toBeVisible();
  await expect(page.getByText(/not an elevation or hazard map/)).toBeVisible();
  await page.screenshot({ path: 'docs/refinement-moon-desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByLabel('Mission', { exact: true }).selectOption('blue-ghost');
  await expect(page.locator('.lunar-mission-detail')).toContainText('Mare Crisium');
  await expect(page.locator('.lunar-mission-detail')).toContainText('LISTER');
  await page.goto('/#missions');
  await expect(page.getByRole('heading', { name: 'Every mission begins with a question.' })).toBeVisible();
  await page.screenshot({ path: 'docs/refinement-missions-desktop.png', fullPage: true, animations: 'disabled' });
  const names = await page.locator('.hm-missions__identity strong').allTextContents();
  expect(new Set(names).size).toBeGreaterThan(1);
  await expect(page.locator('.hm-missions__emblem')).toHaveCount(0);
});

test('dedicated Copilot opens without WebGL', async ({ page }) => {
  await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = () => null; });
  await page.goto('/#copilot');
  await expect(page.getByRole('heading', { name: 'Horizon Intelligence' }).first()).toBeVisible();
  await expect(page.getByText(/Copilot is not configured|session/i).first()).toBeVisible();
});
