import { expect, type APIResponse, type Page } from "@playwright/test";

export async function registerSession(page: Page, prefix = "e2e") {
  const id = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  let response: APIResponse | undefined;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    response = await page.request.post("/api/auth/register", {
      data: {
        username: id,
        email: `${id}@poulix.test`,
        password: "password123456",
      },
    });
    if (response.ok()) return id;
    if (response.status() !== 429) break;
    const retryAfter = Number(response.headers()["retry-after"] ?? "2");
    await page.waitForTimeout(Math.max(retryAfter, 2) * 1000);
  }
  expect(response?.ok(), await response?.text()).toBeTruthy();
  return id;
}
