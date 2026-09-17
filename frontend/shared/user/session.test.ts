import { describe, expect, it } from "vitest";
import { isCredentialPath, isPublicAuthPath } from "./session";

describe("auth path helpers", () => {
  it("treats login and register as credential pages", () => {
    expect(isCredentialPath("/login")).toBe(true);
    expect(isCredentialPath("/register")).toBe(true);
    expect(isCredentialPath("/register/extra")).toBe(true);
    expect(isCredentialPath("/deposit/callback")).toBe(false);
    expect(isCredentialPath("/")).toBe(false);
  });

  it("keeps the ZarinPal return URL public without treating it as a credential page", () => {
    expect(isPublicAuthPath("/deposit/callback")).toBe(true);
    expect(isPublicAuthPath("/deposit/callback/")).toBe(true);
    expect(isPublicAuthPath("/deposit")).toBe(false);
    expect(isCredentialPath("/deposit/callback")).toBe(false);
  });
});
