import { expect, test } from "@playwright/test";
import { registerSession } from "./register";

test.describe("ZarinPal deposit callback", () => {
  test("authenticated return stays on /deposit/callback and shows the paid balance", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerSession(page, "dep");

    let verified = false;
    await page.route("**/api/wallets/deposit/callback**", async (route) => {
      verified = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "PAID",
          alreadyVerified: false,
          authority: "Sauthority",
          refId: "201",
          balance: 1_250_000,
          currency: "IRR",
        }),
      });
    });
    await page.route("**/api/wallets/balance", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balance: 1_250_000, currency: "IRR" }),
      });
    });

    await page.goto("/deposit/callback?Authority=Sauthority&Status=OK", {
      waitUntil: "domcontentloaded",
    });

    expect(page.url()).toContain("/deposit/callback");
    expect(page.url()).toContain("Authority=Sauthority");
    await expect(
      page.getByRole("heading", {
        name: /deposit successful|افزایش موجودی با موفقیت/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("1,250,000 IRR")).toBeVisible();
    expect(verified).toBe(true);

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("1,250,000 IRR").first()).toBeVisible();
    expect(page.url().replace(/\/$/, "")).toMatch(/http:\/\/localhost$/);
    await context.close();
  });

  test("NOK callback stays on the return page and does not credit the wallet", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerSession(page, "dep");

    await page.route("**/api/wallets/deposit/callback**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "NOK",
          authority: "Scancelled",
        }),
      });
    });
    await page.route("**/api/wallets/balance", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ balance: 0, currency: "IRR" }),
      });
    });

    await page.goto("/deposit/callback?Authority=Scancelled&Status=NOK", {
      waitUntil: "domcontentloaded",
    });

    expect(page.url()).toContain("/deposit/callback");
    await expect(
      page.getByRole("heading", {
        name: /deposit cancelled|افزایش موجودی لغو شد/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("1,250,000 IRR")).toHaveCount(0);
    await expect(page.getByText("0 IRR").first()).toBeVisible();
    await context.close();
  });
});
