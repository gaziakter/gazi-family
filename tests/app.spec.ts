import { test, expect } from "@playwright/test";
const origin = "http://localhost:3101";
const credentials = {
  email: "owner@test.invalid",
  password: "Owner-test-password-123",
};
test("setup, server authorization, persistence and relational validation", async ({
  playwright,
}) => {
  const owner = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  const anonymous = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  expect((await anonymous.get("/api/data")).status()).toBe(401);
  expect(
    (
      await owner.post("/api/auth", {
        data: { action: "setup", name: "Test Owner", ...credentials },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await anonymous.post("/api/auth", {
        data: {
          action: "setup",
          name: "Second Owner",
          email: "second@test.invalid",
          password: "Another-password-123",
        },
      })
    ).ok(),
  ).toBeFalsy();
  let data = await (await owner.get("/api/data")).json();
  expect(data.users).toHaveLength(1);
  expect(data.transactions).toHaveLength(0);
  const grocery = data.categories.find(
    (c: { name: string }) => c.name === "Groceries",
  );
  const salary = data.categories.find(
    (c: { name: string }) => c.name === "Salary",
  );
  const save = (collection: string, values: object, id?: string) =>
    owner.post("/api/data", {
      data: { collection, action: "save", values, id },
    });
  expect(
    (
      await save("transactions", {
        title: "Test groceries",
        type: "expense",
        amount: 1234.56,
        date: "2026-09-20",
        account: "Cash",
        categoryId: grocery.id,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save("transactions", {
        title: "Wrong category",
        type: "expense",
        amount: 100,
        date: "2026-09-20",
        account: "Cash",
        categoryId: salary.id,
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await save("transactions", {
        title: "Negative",
        type: "expense",
        amount: -1,
        date: "2026-09-20",
        account: "Cash",
        categoryId: grocery.id,
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await save("budgets", {
        categoryId: grocery.id,
        month: "2026-09",
        amount: 5000,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save("budgets", {
        categoryId: grocery.id,
        month: "2026-09",
        amount: 9000,
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (
      await owner.post("/api/data", {
        data: { collection: "categories", action: "delete", id: grocery.id },
      })
    ).ok(),
  ).toBeFalsy();
  expect(
    (await save("roles", { name: "Limited", permissions: [] })).ok(),
  ).toBeTruthy();
  data = await (await owner.get("/api/data")).json();
  expect(data.transactions[0].amount).toBe(1234.56);
  expect(
    (
      await save("users", {
        name: "Read Only",
        email: "viewer@test.invalid",
        password: "Viewer-test-password-123",
        roleId: data.roles.find((r: { name: string }) => r.name === "Limited")
          .id,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await save(
        "roles",
        { name: "Renamed Owner", permissions: [] },
        data.roles.find((r: { name: string }) => r.name === "Owner").id,
      )
    ).ok(),
  ).toBeFalsy();
  const viewer = await playwright.request.newContext({
    baseURL: origin,
    extraHTTPHeaders: { Origin: origin },
  });
  expect(
    (
      await viewer.post("/api/auth", {
        data: {
          action: "login",
          email: "viewer@test.invalid",
          password: "Viewer-test-password-123",
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await viewer.post("/api/data", {
        data: {
          collection: "transactions",
          action: "delete",
          id: data.transactions[0].id,
        },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await owner.post("/api/data", {
        headers: { Origin: "https://different.invalid" },
        data: {
          collection: "transactions",
          action: "delete",
          id: data.transactions[0].id,
        },
      })
    ).status(),
  ).toBe(403);
  const oldSession = await owner.storageState();
  expect(
    (
      await owner.post("/api/password", {
        data: {
          currentPassword: credentials.password,
          password: "Updated-owner-password-123",
        },
      })
    ).ok(),
  ).toBeTruthy();
  const stale = await playwright.request.newContext({
    baseURL: origin,
    storageState: oldSession,
  });
  expect((await stale.get("/api/data")).status()).toBe(401);
  expect(
    (
      await owner.post("/api/password", {
        data: {
          currentPassword: "Updated-owner-password-123",
          password: credentials.password,
        },
      })
    ).ok(),
  ).toBeTruthy();
  await Promise.all([
    owner.dispose(),
    anonymous.dispose(),
    viewer.dispose(),
    stale.dispose(),
  ]);
});
test("real member login, add and edit transaction, export report", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A little more peace of mind." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description").fill("Browser groceries");
  await page.getByLabel("Amount (৳)").fill("450.25");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "Groceries" });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(
    page.getByText("Browser groceries", { exact: true }),
  ).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "Browser groceries" });
  await row.getByRole("button", { name: "Edit record" }).click();
  await page.getByLabel("Amount (৳)").fill("500.50");
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(row).toContainText("500.5");
  await page.reload();
  await expect(
    page.getByText("Browser groceries", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/gazi-family-.*\.csv/);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome home" }),
  ).toBeVisible();
});
test("demo dashboard, filters, modal persistence and mobile layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/demo");
  await expect(page.getByText("Demo workspace")).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  await page.getByLabel("Description").fill("Demo browser expense");
  await page.getByLabel("Amount (৳)").fill("89.99");
  await page
    .getByLabel("Category", { exact: true })
    .selectOption({ label: "Groceries" });
  await page.getByRole("button", { name: "Save transaction" }).click();
  await expect(page.getByText("Demo browser expense")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Demo browser expense")).toBeVisible();
  await page.getByRole("button", { name: "Expenses", exact: true }).click();
  await page
    .getByPlaceholder("Search transactions…")
    .fill("Demo browser expense");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Delete record" }).click();
  await page
    .getByRole("button", { name: "Delete record", exact: true })
    .last()
    .click();
  await expect(page.getByText("No transactions yet")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Savings goals", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Savings goals", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
