import { test, expect } from "@playwright/test";
test("release readiness, coordinate feedback, keyboard zoom and operator import guide", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Scientific readiness" }),
  ).toContainText("No reviewed DEM");
  await expect(
    page.getByRole("region", { name: "Scientific readiness" }),
  ).toContainText("Server key missing");
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  const canvas = page.locator("canvas");
  async function moonWidth() {
    return canvas.evaluate((node) => {
      const gl = (node as HTMLCanvasElement).getContext("webgl2")!;
      const width = gl.drawingBufferWidth,
        buffer = new Uint8Array(width * 4);
      gl.readPixels(
        0,
        Math.floor(gl.drawingBufferHeight / 2),
        width,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        buffer,
      );
      let bright = 0;
      for (let i = 0; i < buffer.length; i += 4) if (buffer[i] > 35) bright++;
      return bright;
    });
  }
  const before = await moonWidth();
  await page.getByRole("button", { name: "Zoom in Moon" }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(moonWidth).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Zoom out Moon" }).click();
  await page
    .getByRole("spinbutton", { name: "Latitude", exact: true })
    .fill("-88");
  await page.getByRole("button", { name: "Apply target" }).click();
  await expect(
    page.getByText("Study target applied.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open commands" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open commands" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Lunar science", exact: true })
    .click();
  await page
    .getByText("Import a reviewed local DEM · operator guide", { exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Terrain evidence" }),
  ).toContainText("science:inspect");
  await expect(
    page.getByText("No real LOLA product has been processed", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "CLPS intelligence", exact: true })
    .click();
  await page
    .getByText("Mission verification & coordinate reference", { exact: true })
    .first()
    .click();
  await expect(
    page
      .getByText("Access date not recorded; source not reverified here", {
        exact: false,
      })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Solar System", exact: true }).click();
  await page
    .getByRole("button", { name: "Follow selected object", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Free camera", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Mission control", exact: true })
    .click();
  await expect(page.getByText("Imagery loaded · 1024 × 512")).toBeVisible();
  await page.screenshot({ path: "docs/phase3-desktop.png", fullPage: true });
});
