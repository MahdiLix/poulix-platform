import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";

const loginAndStoreSession = vi.fn();
const searchParamsGet = vi.hoisted(() =>
  vi.fn((_key: string) => null as string | null),
);

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

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => searchParamsGet(key),
  }),
}));

vi.mock("@/features/auth/lib/auth", () => ({
  validateIdentifier: () => null,
  validatePassword: () => null,
  loginAndStoreSession: (...args: unknown[]) => loginAndStoreSession(...args),
}));

vi.mock("@/shared/ui/Toast", () => ({
  flashToast: vi.fn(),
}));

const signedInUser = {
  user: {
    id: "1",
    email: "sara@poulix.test",
    username: "sara",
    role: "USER",
  },
};

function submitLogin() {
  render(
    <ThemeProvider>
      <LanguageProvider>
        <LoginPage />
      </LanguageProvider>
    </ThemeProvider>,
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
}

describe("login redirect", () => {
  beforeEach(() => {
    loginAndStoreSession.mockReset();
    searchParamsGet.mockReset();
    searchParamsGet.mockReturnValue(null);
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
    // Production/dev responses never include accessToken — the session
    // lives only in the HttpOnly cookie set by the backend.
    loginAndStoreSession.mockResolvedValue(signedInUser);

    submitLogin();

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/");
    });
  });

  it("returns to a safe next path after a successful login", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "next" ? "/send" : null,
    );
    loginAndStoreSession.mockResolvedValue(signedInUser);

    submitLogin();

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/send");
    });
  });

  it("rejects an unsafe next path and falls back to /", async () => {
    searchParamsGet.mockImplementation((key: string) =>
      key === "next" ? "//evil.example" : null,
    );
    loginAndStoreSession.mockResolvedValue(signedInUser);

    submitLogin();

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/");
    });
  });
});
