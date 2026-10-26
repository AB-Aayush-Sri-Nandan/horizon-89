import {test, expect} from './fixtures.ts';

test('Vite proxies actual Express health, fixture science and cached provenance', async ({page, request}) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200); expect((await health.json()).service).toBe('horizon89-api');
  // No /api route interception: browser -> Vite -> Express -> controlled JPL transport.
  await page.route('**/textures/moon-lro.png', r => r.fulfill({status:404}));
  const response = page.waitForResponse(r => r.url().includes('/api/horizons?') && r.status() === 200);
  await page.goto('/');
  await page.getByRole('button',{name:'SKIP',exact:true}).click();
  const first = await (await response).json();
  expect(['LIVE','CACHED']).toContain(first.status);
  expect(first.provenance.sourceVersion).toBe('CONTROLLED_TEST_FIXTURE');
  await expect(page.getByText('+0.208°',{exact:true})).toBeVisible();
  await expect(page.getByText('−3.874°',{exact:true})).toBeVisible();
  const cached = await request.get(`/api/horizons?${new URLSearchParams({lat:'-89',lon:'0',alt:'0',time:first.timeUTC})}`);
  expect(cached.status()).toBe(200);
  const data = await cached.json(); expect(data.status).toBe('CACHED');
  expect(data.provenance.producedAtUTC).toBe(first.provenance.producedAtUTC);
  expect(errors).toEqual([]);
});

test('altitude reaches Express and failed new site retains previous snapshot without stale displayed angles', async ({page, request}) => {
  await page.route('**/textures/moon-lro.png', r => r.fulfill({status:404}));
  await page.goto('/'); await page.getByRole('button',{name:'SKIP',exact:true}).click();
  await expect(page.getByText('+0.208°',{exact:true})).toBeVisible();
  await page.getByLabel('Altitude above reference ellipsoid (km)').fill('1.25');
  const changed = page.waitForResponse(r => r.url().includes('/api/horizons?') && r.url().includes('alt=1.25'));
  await page.getByRole('button',{name:'APPLY TARGET'}).click();
  expect((await (await changed).json()).lunarSite.altitudeKm).toBe(1.25);
  await expect(page.getByText('+0.208°',{exact:true})).toBeVisible();
  await page.getByLabel('LAT',{exact:true}).fill('-88');
  const unavailable = page.waitForResponse(r => r.url().includes('/api/horizons?') && r.status() === 502);
  await page.getByRole('button',{name:'APPLY TARGET'}).click();
  const browserFailure = await unavailable;
  expect(browserFailure.status()).toBe(502);
  // Read the same error endpoint through APIRequestContext; Chromium can evict failed-response bodies.
  const failed = await (await request.get(browserFailure.url())).json();
  expect(failed.status).toBe('UNAVAILABLE'); expect(failed.sun).toBeUndefined();
  await expect(page.getByText('+0.208°',{exact:true})).toHaveCount(0);
  await expect(page.getByText(/Last successful analysis retained:/)).toBeVisible();
  await expect(page.getByText('No fallback or demo geometry is being shown').first()).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByText('REFERENCE SPHERE · IMAGERY UNAVAILABLE')).toBeVisible();
});
