import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync(new URL('../fixtures/horizons-legacy.json', import.meta.url), 'utf8'));

// Route fixtures validate frontend behaviour only; they do not establish a backend exists.
test('missing imagery leaves usable reference sphere, unavailable telemetry, and pointer controls', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.route('**/textures/moon-lro.png', r => r.fulfill({ status: 404, body: 'Missing imagery (test)' }));
  await page.route('**/api/horizons?**', r => r.fulfill({status: 503, json: {status: 'UNAVAILABLE'}}));
  await page.goto('/');
  await page.getByRole('button', { name: 'SKIP', exact: true }).click();
  await expect(page.getByText('REFERENCE SPHERE · IMAGERY UNAVAILABLE')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('No fallback or demo geometry is being shown').first()).toBeVisible();
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 70, box!.y + box!.height / 2 + 20, {steps: 8});
  await page.mouse.up();
  await page.mouse.wheel(0, 100);
  await expect(page.getByText('DRAG TO ROTATE · SCROLL TO ZOOM')).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'APPLY TARGET'})).toBeEnabled();
  expect(errors).toEqual([]);
  // Chromium logs the intentionally rejected image/API requests; record rather than suppress them.
  await testInfo.attach('console-counts', {body: JSON.stringify({pageErrors: errors, consoleErrorCount: consoleErrors.length, consoleErrors}, null, 2), contentType: 'application/json'});
  console.log(`Missing-asset test: ${errors.length} page errors; ${consoleErrors.length} console errors from intentional HTTP failures.`);
});

test('legacy wire fixture renders exact precision and never claims terrain correction', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/textures/moon-lro.png', r => r.fulfill({status: 404}));
  await page.route('**/api/horizons?**', r => {
    const u = new URL(r.request().url());
    return r.fulfill({json: {...fixture, lunarSite: {latitude: Number(u.searchParams.get('lat')), longitude: Number(u.searchParams.get('lon'))}, timeUTC: u.searchParams.get('time')}});
  });
  await page.goto('/');
  await page.getByRole('button', {name: 'SKIP', exact: true}).click();
  await expect(page.getByText('+0.208°', {exact: true})).toBeVisible();
  await expect(page.getByText('−3.874°', {exact: true})).toBeVisible();
  await expect(page.getByText('189.965°', {exact: true})).toBeVisible();
  await expect(page.getByText('4.935°', {exact: true})).toBeVisible();
  await expect(page.getByText('Reference horizon only · terrain not evaluated')).toBeVisible();
  expect(errors).toEqual([]);
});

test('small viewport and reduced motion preserve fallback and manual controls', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.route('**/textures/moon-lro.png', r => r.fulfill({status: 404}));
  await page.route('**/api/horizons?**', r => r.fulfill({status: 503}));
  await page.goto('/');
  await page.getByRole('button', {name: 'SKIP', exact: true}).click();
  await expect(page.getByRole('button', {name: 'APPLY TARGET'})).toBeVisible();
  await expect(page.getByText('REFERENCE SPHERE · IMAGERY UNAVAILABLE')).toBeVisible();
});
