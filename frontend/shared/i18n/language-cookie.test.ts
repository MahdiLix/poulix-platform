import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE, parseLanguageCookie } from "./language-cookie";

describe("parseLanguageCookie", () => {
  it("uses English unless the cookie is exactly fa", () => {
    expect(parseLanguageCookie(undefined)).toBe(DEFAULT_LANGUAGE);
    expect(parseLanguageCookie("en")).toBe("en");
    expect(parseLanguageCookie("fa")).toBe("fa");
    expect(parseLanguageCookie("FA")).toBe("en");
    expect(parseLanguageCookie("de")).toBe("en");
  });
});
