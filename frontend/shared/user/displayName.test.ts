import { describe, expect, it } from "vitest";
import {
  getDisplayName,
  getUserInitials,
  isolateText,
} from "@/shared/user/displayName";

describe("getDisplayName", () => {
  it("prefers username over email local-part", () => {
    expect(
      getDisplayName({
        username: "mahdi_lix",
        email: "other@gmail.com",
      }),
    ).toBe("mahdi_lix");
  });

  it("falls back to email local-part", () => {
    expect(getDisplayName({ email: "mahdi_lix@gmail.com" })).toBe("mahdi_lix");
  });

  it("uses a fallback when the user is missing", () => {
    expect(getDisplayName(null, "Guest User")).toBe("Guest User");
  });
});

describe("getUserInitials", () => {
  it("uses the username", () => {
    expect(getUserInitials({ username: "sara" })).toBe("SA");
  });
});

describe("isolateText", () => {
  it("wraps mixed-direction names so RTL messages stay in order", () => {
    const isolated = isolateText("mahdi_lix@gmail.com");
    expect(isolated.startsWith("\u2068")).toBe(true);
    expect(isolated.endsWith("\u2069")).toBe(true);
  });
});
