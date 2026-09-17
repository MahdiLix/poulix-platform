import { describe, expect, it } from "vitest";
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
