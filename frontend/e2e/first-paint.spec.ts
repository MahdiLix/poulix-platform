import { expect, test, type Page } from "@playwright/test";
import { registerSession } from "./register";

function snapshot(page: Page) {
  return page.evaluate(() => ({
    href: location.href,
    lang: document.documentElement.lang,
    dir: document.documentElement.dir,
    hasDark: document.documentElement.classList.contains("dark"),
    hasRtl: document.documentElement.classList.contains("rtl"),
    colorScheme: document.documentElement.style.colorScheme,
    text: (document.body.innerText || "").slice(0, 400),
    themeLs: localStorage.getItem("poulix-theme"),
    cookies: document.cookie,
  }));
}

async function watchHydration(page: Page) {
  await page.evaluate(() => {
    const root = document.documentElement;
    const state = {
      themes: [root.classList.contains("dark") ? "dark" : "light"],
      langs: [root.lang || "en"],
      dirs: [root.dir || "ltr"],
    };
    new MutationObserver(() => {
      const theme = root.classList.contains("dark") ? "dark" : "light";
      const lang = root.lang || "en";
      const dir = root.dir || "ltr";
      if (state.themes.at(-1) !== theme) state.themes.push(theme);
      if (state.langs.at(-1) !== lang) state.langs.push(lang);
      if (state.dirs.at(-1) !== dir) state.dirs.push(dir);
    }).observe(root, {
      attributes: true,
      attributeFilter: ["class", "lang", "dir", "style"],
    });
    (
      window as unknown as { __poulixHydration: typeof state }
    ).__poulixHydration = state;
  });
}

function hydration(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __poulixHydration: {
            themes: string[];
            langs: string[];
            dirs: string[];
          };
        }
      ).__poulixHydration,
  );
}

function unsignedJwt(expOffsetSeconds: number) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({
    exp: Math.floor(Date.now() / 1000) + expOffsetSeconds,
    sub: "nobody",
  })}.sig`;
}

test.describe("first paint", () => {
  test("unauthenticated / paints the dashboard instead of redirecting to login", async ({
    page,
  }) => {
    const statuses: number[] = [];
    page.on("response", (res) => {
      if (res.request().resourceType() === "document") {
        statuses.push(res.status());
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.href.replace(/\/$/, "")).toMatch(/http:\/\/localhost$/);
    expect(first.href).not.toContain("/login");
    expect(statuses[0]).not.toBe(307);
    expect(first.themeLs).toBeNull();
    await expect(page.getByText("17,500,000")).toBeVisible();
  });

  test("login refresh with en and light cookies is English LTR light on first paint", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      { name: "poulix_lang", value: "en", url: "http://localhost/" },
      { name: "poulix_theme", value: "light", url: "http://localhost/" },
    ]);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.lang).toBe("en");
    expect(first.dir).toBe("ltr");
    expect(first.hasDark).toBe(false);
    expect(first.hasRtl).toBe(false);
    expect(first.text).toContain("Welcome back");
    expect(first.text).not.toContain("خوش آمدید");
    expect(first.themeLs).toBeNull();

    await watchHydration(page);
    await page.waitForTimeout(800);
    const flips = await hydration(page);
    expect(flips.themes).toEqual(["light"]);
    expect(flips.langs).toEqual(["en"]);
    expect(flips.dirs).toEqual(["ltr"]);
  });

  test("login refresh with fa and dark cookies is Persian RTL dark on first paint", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      { name: "poulix_lang", value: "fa", url: "http://localhost/" },
      { name: "poulix_theme", value: "dark", url: "http://localhost/" },
    ]);
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.lang).toBe("fa");
    expect(first.dir).toBe("rtl");
    expect(first.hasDark).toBe(true);
    expect(first.hasRtl).toBe(true);
    expect(first.text).toContain("خوش آمدید");
    expect(first.text).not.toContain("Welcome back");
    expect(first.themeLs).toBeNull();

    await watchHydration(page);
    await page.waitForTimeout(800);
    const hydrated = await snapshot(page);
    const flips = await hydration(page);
    expect(hydrated.lang).toBe("fa");
    expect(hydrated.hasDark).toBe(true);
    expect(hydrated.text).toContain("خوش آمدید");
    expect(hydrated.themeLs).toBeNull();
    expect(flips.themes).toEqual(["dark"]);
    expect(flips.langs).toEqual(["fa"]);
    expect(flips.dirs).toEqual(["rtl"]);
  });

  test("OS dark with no theme cookie persists dark, not system, and never uses localStorage", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.hasDark).toBe(true);
    expect(first.cookies).toMatch(/poulix_theme=dark/);
    expect(first.cookies).not.toMatch(/poulix_theme=system/);
    expect(first.themeLs).toBeNull();

    await watchHydration(page);
    await page.waitForTimeout(800);
    expect((await hydration(page)).themes).toEqual(["dark"]);

    await page.reload({ waitUntil: "domcontentloaded" });
    const second = await snapshot(page);
    expect(second.hasDark).toBe(true);
    expect(second.themeLs).toBeNull();
    await context.close();
  });

  test("OS light with no theme cookie persists light, not system", async ({
    browser,
  }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.hasDark).toBe(false);
    expect(first.cookies).toMatch(/poulix_theme=light/);
    expect(first.cookies).not.toMatch(/poulix_theme=system/);
    expect(first.themeLs).toBeNull();

    await watchHydration(page);
    await page.waitForTimeout(800);
    expect((await hydration(page)).themes).toEqual(["light"]);
    await context.close();
  });

  test("theme toggle updates the document immediately and not localStorage", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const before = await snapshot(page);
    await watchHydration(page);
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    const afterToggle = await snapshot(page);
    expect(afterToggle.hasDark).toBe(!before.hasDark);
    expect(afterToggle.themeLs).toBeNull();
    expect(afterToggle.cookies).toMatch(/poulix_theme=(light|dark)/);
    expect((await hydration(page)).themes).toEqual([
      before.hasDark ? "dark" : "light",
      afterToggle.hasDark ? "dark" : "light",
    ]);

    await page.reload({ waitUntil: "domcontentloaded" });
    const afterReload = await snapshot(page);
    expect(afterReload.hasDark).toBe(afterToggle.hasDark);
    expect(afterReload.themeLs).toBeNull();
  });

  test("register is also cookie-themed on first paint", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      { name: "poulix_lang", value: "fa", url: "http://localhost/" },
      { name: "poulix_theme", value: "dark", url: "http://localhost/" },
    ]);
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.hasDark).toBe(true);
    expect(first.lang).toBe("fa");
    expect(first.hasRtl).toBe(true);
    expect(first.themeLs).toBeNull();
  });

  test("expired session cookie paints the guest dashboard instead of login", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "poulix_session",
        value: unsignedJwt(-60),
        url: "http://localhost/",
        httpOnly: true,
      },
    ]);
    const statuses: number[] = [];
    page.on("response", (res) => {
      if (res.request().resourceType() === "document") {
        statuses.push(res.status());
      }
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.href).not.toContain("/login");
    expect(statuses[0]).not.toBe(307);
    await expect(page.getByText("17,500,000")).toBeVisible();
  });

  test("invalid unexpired session stays on the guest dashboard", async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: "poulix_session",
        value: unsignedJwt(3600),
        url: "http://localhost/",
        httpOnly: true,
      },
    ]);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.href).not.toContain("/login");
    await expect(page.getByText("17,500,000")).toBeVisible();
  });

  test("authenticated / paints the dashboard, not a route loading gate", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await registerSession(page, "e2e");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const first = await snapshot(page);
    expect(first.href.replace(/\/$/, "")).toMatch(/http:\/\/localhost$/);
    expect(first.text).not.toMatch(/^[\s\n]*Loading|^[\s\n]*در حال بارگذاری/);
    expect(first.text).toMatch(/Poulix|پولیکس|Available Balance|موجودی/);
    expect(first.themeLs).toBeNull();
    await context.close();
  });

  test("logout stays in the app and keeps theme and language cookies", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await context.addCookies([
      { name: "poulix_lang", value: "fa", url: "http://localhost/" },
      { name: "poulix_theme", value: "dark", url: "http://localhost/" },
    ]);
    await registerSession(page, "e2e");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "E2", exact: true }).click();
    await page.getByRole("button", { name: /log out|خروج/i }).click();
    await expect(page.getByText("17,500,000")).toBeVisible();
    const after = await snapshot(page);
    expect(after.href).not.toContain("/login");
    expect(after.hasDark).toBe(true);
    expect(after.lang).toBe("fa");
    expect(after.hasRtl).toBe(true);
    expect(after.cookies).toMatch(/poulix_theme=dark/);
    expect(after.cookies).toMatch(/poulix_lang=fa/);
    await context.close();
  });
});
