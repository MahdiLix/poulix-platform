import { describe, expect, it } from "vitest";
import {
  decodeJwtPayload,
  getTokenExpiryMs,
  isPublicAuthPath,
  isTokenExpired,
} from "@/shared/user/session";

function makeToken(expSeconds: number) {
  const payload = btoa(JSON.stringify({ exp: expSeconds }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `header.${payload}.sig`;
}

describe("session expiry", () => {
  it("decodes the JWT expiry", () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    expect(decodeJwtPayload(makeToken(exp))?.exp).toBe(exp);
    expect(getTokenExpiryMs(makeToken(exp))).toBe(exp * 1000);
  });

  it("detects an expired token", () => {
    const exp = Math.floor(Date.now() / 1000) - 5;
    expect(isTokenExpired(makeToken(exp))).toBe(true);
  });

  it("keeps login and register public", () => {
    expect(isPublicAuthPath("/login")).toBe(true);
    expect(isPublicAuthPath("/register")).toBe(true);
    expect(isPublicAuthPath("/")).toBe(false);
    expect(isPublicAuthPath("/admin")).toBe(false);
  });
});
