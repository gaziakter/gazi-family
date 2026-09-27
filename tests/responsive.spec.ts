import { test, expect, type Page } from "@playwright/test";

async function fits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) {
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    for (const field of await dialog.locator("input:visible, select:visible, textarea:visible").all()) {
      const fieldBox = (await field.boundingBox())!;
      expect(fieldBox.x).toBeGreaterThanOrEqual(box.x);
      expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(box.x + box.width);
    }
  }
}

for (const width of [320, 375, 768, 1024]) {
  test(`all pages and forms fit ${width}px screens`, async ({ page }) => {
    await page.setViewportSize({ width, height: 520 });
    await page.goto("/demo");
    await expect(page.getByRole("button", { name: /Account menu/ })).toBeVisible();
    const pages = ["Overview", "Income", "Expenses", "Categories", "Budgets", "Savings goals", "Reports", "Cash & Bank accounts", "Transfers", "Family members", "Roles & permissions"];
    for (const name of pages) {
      if (width <= 720) await page.getByRole("button", { name: "Open navigation" }).click();
      await page.locator("aside").getByRole("button", { name, exact: true }).click();
      await fits(page);
      const add = page.locator(".heading-actions").getByRole("button", { name: /Add new|Add transaction/ });
      if (await add.count()) {
        await add.click();
        await fits(page);
        const save = page.getByRole("dialog").getByRole("button", { name: /^Save / });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeInViewport();
        await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
      }
    }
    await page.getByRole("button", { name: /Account menu/ }).click();
    await page.getByRole("button", { name: "Setting", exact: true }).click();
    await fits(page);
  });
}
