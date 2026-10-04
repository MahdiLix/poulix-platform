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

function renderMenu() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <ProfileMenu />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("ProfileMenu logout", () => {
  it("places logout in the panel and calls the shared signOut", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "TU" }));
    fireEvent.click(screen.getByRole("button", { name: /log out|خروج/i }));
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("keeps the avatar button and shows no Login link for signed-in users", () => {
    renderMenu();

    expect(screen.getByRole("button", { name: "TU" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /login|ورود/i })).toBeNull();
  });

  it("links remaining account pages from the panel", () => {
    renderMenu();

    fireEvent.click(screen.getByRole("button", { name: "TU" }));
    const links = screen.getAllByRole("link");
    // Assert by href (and non-empty label) so the test holds whichever
    // language the app starts in (English or Persian).
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
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
    for (const link of links) {
      expect(link.textContent?.trim()).toBeTruthy();
    }
  });
});