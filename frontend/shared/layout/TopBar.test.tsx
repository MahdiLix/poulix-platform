import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "@/shared/layout/TopBar";

// Forward every prop (aria-label, className, ...) to the anchor. A mock that
// only renders { href, children } would drop the aria-label and leave the
// logo-only link without an accessible name.
vi.mock("next/link", () => ({
  default: ({ children, ...props }: ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/shared/i18n/LanguageProvider", () => ({
  useLanguage: () => ({
    t: { common: { appName: "Poulix" } },
    language: "en",
  }),
}));

vi.mock("@/features/notifications/components/NotificationBell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));
vi.mock("@/shared/brand/BrandLogo", () => ({
  BrandLogo: () => <span data-testid="brand-logo" />,
}));
vi.mock("@/shared/layout/ProfileMenu", () => ({
  ProfileMenu: () => <div data-testid="profile-menu" />,
}));
vi.mock("@/shared/search/GlobalSearch", () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));
vi.mock("@/shared/theme/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));
vi.mock("@/shared/theme/LanguageToggle", () => ({
  LanguageToggle: () => <div data-testid="language-toggle" />,
}));

describe("TopBar mobile brand", () => {
  it("shows only the logo, without the app name text", () => {
    render(<TopBar />);

    expect(screen.getByTestId("brand-logo")).toBeInTheDocument();
    expect(screen.queryByText("Poulix")).toBeNull();
  });

  it("keeps the logo link to home accessible by app name", () => {
    render(<TopBar />);

    const home = screen.getByRole("link", { name: "Poulix" });
    expect(home).toHaveAttribute("href", "/");
    expect(home.textContent).toBe("");
  });

  it("still renders search, notifications and the profile menu", () => {
    render(<TopBar />);

    expect(screen.getByTestId("global-search")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByTestId("profile-menu")).toBeInTheDocument();
  });
});