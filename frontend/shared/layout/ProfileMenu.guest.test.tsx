import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";

vi.mock("@/shared/user/UserProvider", () => ({
  useUser: () => ({
    user: null,
    status: "unauthenticated",
    signOut: vi.fn(),
  }),
  useUserInitials: () => "U",
}));

describe("ProfileMenu guest navigation", () => {
  it("opens the same sidebar pages without sending guests to login", () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ProfileMenu />
        </LanguageProvider>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "U" }));
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual([
      "/",
      "/statistics",
      "/history",
      "/send",
      "/deposit",
      "/transfer",
      "/scheduled",
      "/goals",
      "/envelopes",
      "/destinations",
      "/notifications",
      "/security",
      "/profile",
    ]);
    expect(hrefs).not.toContain("/login");
  });
});
