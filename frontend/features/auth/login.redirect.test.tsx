import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";

const loginAndStoreSession = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ""} />,
}));

vi.mock("@/features/auth/lib/auth", () => ({
  validateIdentifier: () => null,
  validatePassword: () => null,
  loginAndStoreSession: (...args: unknown[]) => loginAndStoreSession(...args),
}));

vi.mock("@/shared/ui/Toast", () => ({
  flashToast: vi.fn(),
}));

vi.mock("@/shared/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return {
    ...actual,
    getStoredToken: () => null,
  };
});

describe("login redirect", () => {
  beforeEach(() => {
    loginAndStoreSession.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        assign: vi.fn(),
        replace: vi.fn(),
        pathname: "/login",
        protocol: "http:",
      },
    });
  });

  it("redirects to / after a successful login", async () => {
    loginAndStoreSession.mockResolvedValue({
      accessToken: "token",
      user: {
        id: "1",
        email: "sara@poulix.test",
        username: "sara",
        role: "USER",
      },
    });

    render(
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("sara"), {
      target: { value: "sara" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password1" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: /sign in/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/");
    });
  });
});
