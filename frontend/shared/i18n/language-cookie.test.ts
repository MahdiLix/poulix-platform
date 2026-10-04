import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, parseLanguageCookie } from "./language-cookie";

describe("parseLanguageCookie", () => {
  it("defaults to Persian", () => {
    expect(DEFAULT_LANGUAGE).toBe("fa");
    expect(parseLanguageCookie(undefined)).toBe("fa");
    expect(parseLanguageCookie(null)).toBe("fa");
    expect(parseLanguageCookie("")).toBe("fa");
  });

  it("keeps an explicit en or fa choice", () => {
    expect(parseLanguageCookie("en")).toBe("en");
    expect(parseLanguageCookie("fa")).toBe("fa");
  });

  it("treats anything else as the Persian default", () => {
    expect(parseLanguageCookie("FA")).toBe("fa");
    expect(parseLanguageCookie("EN")).toBe("fa");
    expect(parseLanguageCookie("de")).toBe("fa");
  });
});