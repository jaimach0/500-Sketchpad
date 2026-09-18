import { test, expect } from "@playwright/test";

const dashboardFixture = {
  as_of: "2026-09-18",
  total_companies: 2,
  available_sectors: ["Energy", "Technology"],
  sectors: [
    {
      name: "Energy",
      companies: [
        {
          symbol: "XOM",
          name: "Exxon Mobil",
          price: 118.42,
          change_pct: 0.7,
          quarter_trend: 4.2,
          quarter_closes: [112, 115, 118.42],
          news: [],
          top_insiders: [],
          sources: { price: "fixture" },
        },
      ],
    },
    {
      name: "Technology",
      companies: [
        {
          symbol: "AAPL",
          name: "Apple",
          price: 230.12,
          change_pct: -0.2,
          quarter_trend: 2.1,
          quarter_closes: [225, 228, 230.12],
          news: [],
          top_insiders: [],
          sources: { price: "fixture" },
        },
      ],
    },
  ],
};

// UI tests use deterministic dashboard data; the health test below still
// exercises the real Go server.

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/dashboard", (route) =>
      route.fulfill({ json: dashboardFixture }),
    );
  });

  test("loads and renders company data", async ({ page }) => {
    await page.goto("/");
    const table = page.locator("table");
    await expect(table).toBeVisible();

    const rows = table.locator("tbody tr[data-row]");
    await expect(rows).toHaveCount(2);
    await expect(table.getByText("XOM", { exact: true })).toBeVisible();
  });

  test("sector navigation filters data", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("table")).toBeVisible();

    await page.getByRole("button", { name: "Energy", exact: true }).click();

    await expect(page).toHaveURL(/[?&]sector=Energy/);
    await expect(page.getByText("XOM", { exact: true })).toBeVisible();
    await expect(page.getByText("AAPL", { exact: true })).toHaveCount(0);
  });

  test("clicking a row opens the detail drawer", async ({ page }) => {
    await page.goto("/");
    const table = page.locator("table");
    await expect(table).toBeVisible();

    const firstRow = table.locator("tbody tr[data-row]").first();
    await firstRow.click();

    await expect(page).toHaveURL(/[?&]stock=XOM/);
  });

  test("command palette opens from the search trigger", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("table")).toBeVisible();

    await page.getByRole("button", { name: /Search/ }).first().click();
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(
      palette.getByPlaceholder("Type a command or search…"),
    ).toBeVisible();
  });

  test("API health endpoint returns ok", async ({ request }) => {
    const resp = await request.get("/api/health");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe("ok");
    expect(body.rust_engine).toMatch(/wasm|subprocess|unavailable/);
  });
});
