import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
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
      <LanguageProvider>
        <ProfileMenu />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "TU" }));
    fireEvent.click(screen.getByRole("button", { name: /log out|خروج/i }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});
