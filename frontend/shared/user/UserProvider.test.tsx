import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserProvider, useUser } from "./UserProvider";

const getMe = vi.fn();
const logout = vi.fn();

vi.mock("@/shared/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      getMe: (...args: unknown[]) => getMe(...args),
      logout: (...args: unknown[]) => logout(...args),
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <UserProvider>{children}</UserProvider>;
}

describe("UserProvider session", () => {
  beforeEach(() => {
    getMe.mockReset();
    logout.mockReset();
    getMe.mockResolvedValue({
      id: "user-1",
      email: "sara@poulix.test",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    logout.mockResolvedValue({ success: true });
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...window.location,
        assign: vi.fn(),
        pathname: "/",
        protocol: "http:",
      },
    });
  });

  it.each(["/login", "/register"])(
    "does not probe the session on the public credential page %s",
    async (pathname) => {
      window.location.pathname = pathname;

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() =>
        expect(result.current.status).toBe("unauthenticated"),
      );
      expect(getMe).not.toHaveBeenCalled();
    },
  );

  it("deduplicates immediate focus and visibility session rechecks", async () => {
    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(getMe).toHaveBeenCalledOnce();
  });

  it("awaits logout before redirecting to /login", async () => {
    let resolveLogout: (value: { success: boolean }) => void = () => {};
    logout.mockImplementation(
      () =>
        new Promise<{ success: boolean }>((resolve) => {
          resolveLogout = resolve;
        }),
    );

    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => {
      void result.current.signOut();
    });

    expect(logout).toHaveBeenCalledOnce();
    expect(window.location.assign).not.toHaveBeenCalled();

    await act(async () => {
      resolveLogout({ success: true });
    });

    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/login");
    });
  });

  it("signs out when expiresAt is reached", async () => {
    getMe.mockResolvedValue({
      id: "user-1",
      email: "sara@poulix.test",
      expiresAt: new Date(Date.now() + 80).toISOString(),
    });

    const { result } = renderHook(() => useUser(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("ready"));

    await waitFor(
      () => {
        expect(logout).toHaveBeenCalled();
        expect(window.location.assign).toHaveBeenCalledWith("/login");
      },
      { timeout: 1000 },
    );
  });
});
