import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loginRedirectUrl,
  sanitizeReturnPath,
  withReturnPath,
} from "./login-redirect";

const flashToast = vi.fn();

vi.mock("@/shared/ui/Toast", () => ({
  flashToast: (...args: unknown[]) => flashToast(...args),
}));

describe("login return path", () => {
  beforeEach(() => {
    flashToast.mockReset();
  });

  it("keeps same-origin relative paths", () => {
    expect(sanitizeReturnPath("/send")).toBe("/send");
    expect(sanitizeReturnPath("/deposit?amount=1")).toBe("/deposit?amount=1");
  });

  it("rejects unsafe destinations", () => {
    expect(sanitizeReturnPath(null)).toBe("/");
    expect(sanitizeReturnPath("https://evil.example")).toBe("/");
    expect(sanitizeReturnPath("//evil.example")).toBe("/");
    expect(sanitizeReturnPath("/login")).toBe("/");
    expect(sanitizeReturnPath("/register")).toBe("/");
    expect(sanitizeReturnPath("send")).toBe("/");
  });

  it("builds login URLs with a safe next query", () => {
    expect(loginRedirectUrl("/send")).toBe("/login?next=%2Fsend");
    expect(loginRedirectUrl("//evil.example")).toBe("/login");
    expect(withReturnPath("/register", "/transfer")).toBe(
      "/register?next=%2Ftransfer",
    );
  });
});
