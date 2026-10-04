import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UI_BOOT_SCRIPT } from "./ui-boot-script";

describe("UI_BOOT_SCRIPT", () => {
  it("resolves theme and language from cookies only", () => {
    expect(UI_BOOT_SCRIPT).not.toMatch(/localStorage/);
    expect(UI_BOOT_SCRIPT).toContain("poulix_theme");
    expect(UI_BOOT_SCRIPT).toContain("poulix_lang");
    expect(UI_BOOT_SCRIPT).toContain("prefers-color-scheme: dark");
    expect(UI_BOOT_SCRIPT).not.toContain("poulix-theme");
    expect(UI_BOOT_SCRIPT).not.toMatch(/theme=system|system/);
  });
});

describe("UI_BOOT_SCRIPT language", () => {
  const root = document.documentElement;

  function runBootScript() {
    new Function(UI_BOOT_SCRIPT)();
  }

  function clearCookies() {
    for (const name of ["poulix_lang", "poulix_theme"]) {
      document.cookie = `${name}=; Path=/; Max-Age=0`;
    }
  }

  beforeEach(() => {
    clearCookies();
    root.lang = "";
    root.dir = "";
    root.classList.remove("rtl", "dark");
    root.style.colorScheme = "";
    // jsdom does not implement matchMedia; the boot script calls it when no
    // theme cookie exists.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({ matches: false } as MediaQueryList),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearCookies();
    root.classList.remove("rtl", "dark");
  });

  it("keeps the Persian default when there is no language cookie", () => {
    runBootScript();
    expect(root.lang).toBe("fa");
    expect(root.dir).toBe("rtl");
    expect(root.classList.contains("rtl")).toBe(true);
  });

  it("keeps Persian for an explicit fa cookie", () => {
    document.cookie = "poulix_lang=fa; Path=/";
    runBootScript();
    expect(root.lang).toBe("fa");
    expect(root.dir).toBe("rtl");
  });

  it("applies English only for an explicit en cookie", () => {
    document.cookie = "poulix_lang=en; Path=/";
    runBootScript();
    expect(root.lang).toBe("en");
    expect(root.dir).toBe("ltr");
    expect(root.classList.contains("rtl")).toBe(false);
  });

  it("falls back to Persian for an unknown language cookie", () => {
    document.cookie = "poulix_lang=de; Path=/";
    runBootScript();
    expect(root.lang).toBe("fa");
    expect(root.dir).toBe("rtl");
  });
});