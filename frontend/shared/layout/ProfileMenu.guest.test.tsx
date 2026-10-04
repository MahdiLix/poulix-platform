import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ProfileMenu } from "@/shared/layout/ProfileMenu";

const session = vi.hoisted(() => ({
  status: "unauthenticated" as "unauthenticated" | "loading",
}));

vi.mock("@/shared/user/UserProvider", () => ({
  useUser: () => ({
    user: null,
    status: session.status,
    signOut: vi.fn(),
  }),
  useUserInitials: () => "U",
}));

function renderMenu(showLabel = false) {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <ProfileMenu showLabel={showLabel} />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe("ProfileMenu guest", () => {
  beforeEach(() => {
    session.status = "unauthenticated";
  });

  it("shows a Login link to /login instead of the avatar button", () => {
    renderMenu();

    const login = screen.getByRole("link", { name: /^(login|ورود)$/i });
    expect(login).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "U" })).toBeNull();
  });

  it("shows Login to account in the sidebar variant", () => {
    renderMenu(true);

    const login = screen.getByRole("link", {
      name: /login to account|ورود به حساب کاربری/i,
    });
    expect(login).toHaveAttribute("href", "/login");
  });

  it("never offers logout or the account panel to guests", () => {
    renderMenu();

    expect(screen.queryByRole("button", { name: /log out|خروج/i })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the avatar while the session is still loading", () => {
    session.status = "loading";
    renderMenu();

    expect(screen.queryByRole("link", { name: /login|ورود/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "U" }));
    expect(screen.queryByRole("button", { name: /log out|خروج/i })).toBeNull();
  });
});