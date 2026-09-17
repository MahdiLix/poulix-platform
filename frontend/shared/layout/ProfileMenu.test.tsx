import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/shared/user/UserProvider", () => ({
  useUser: () => ({
    user: {
      id: "user-1",
      username: "test-user",
      email: "test@example.com",
      role: "USER",
    },
    status: "ready",
    signOut,
  }),
  useUserInitials: () => "TU",
}));

describe("ProfileMenu logout", () => {
  it("places logout in the panel and calls the shared signOut", () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ProfileMenu />
        </LanguageProvider>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "TU" }));
    fireEvent.click(screen.getByRole("button", { name: /log out|خروج/i }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("links remaining account pages from the panel", () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ProfileMenu />
        </LanguageProvider>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "TU" }));
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
    expect(screen.getByRole("link", { name: /security/i })).toHaveAttribute(
      "href",
      "/security",
    );
    expect(
      screen.getByRole("link", { name: /saved destinations/i }),
    ).toHaveAttribute("href", "/destinations");
    expect(screen.getByRole("link", { name: /saving goals/i })).toHaveAttribute(
      "href",
      "/goals",
    );
    expect(
      screen.getByRole("link", { name: /virtual envelopes/i }),
    ).toHaveAttribute("href", "/envelopes");
    expect(
      screen.getByRole("link", { name: /scheduled payments/i }),
    ).toHaveAttribute("href", "/scheduled");
    expect(
      screen.getByRole("link", { name: /notifications/i }),
    ).toHaveAttribute("href", "/notifications");
  });
});
