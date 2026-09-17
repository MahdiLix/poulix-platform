import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_THEME,
  applyDocumentTheme,
  parseThemeCookie,
  themeClassName,
  writeThemeCookie,
} from "./theme-cookie";

describe("parseThemeCookie", () => {
  it("accepts light and dark and treats anything else as light", () => {
    expect(parseThemeCookie(undefined)).toBe(DEFAULT_THEME);
    expect(parseThemeCookie("light")).toBe("light");
    expect(parseThemeCookie("dark")).toBe("dark");
    expect(parseThemeCookie("system")).toBe("light");
    expect(parseThemeCookie("Dim")).toBe("light");
  });
});

describe("themeClassName", () => {
  it("only emits the dark class for an explicit dark preference", () => {
    expect(themeClassName("dark")).toBe("dark");
    expect(themeClassName("light")).toBe("");
  });
});

describe("applyDocumentTheme", () => {
  afterEach(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
    document
      .querySelectorAll("style[data-poulix-theme-switch]")
      .forEach((node) => node.remove());
  });

  it("updates the document class and color-scheme immediately", () => {
    applyDocumentTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");

    applyDocumentTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
  });
});

describe("writeThemeCookie", () => {
  it("persists only light or dark on poulix_theme", () => {
    writeThemeCookie("dark");
    expect(document.cookie).toMatch(/poulix_theme=dark/);
    expect(document.cookie).not.toMatch(/poulix_theme=system/);
    writeThemeCookie("light");
    expect(document.cookie).toMatch(/poulix_theme=light/);
  });
});
