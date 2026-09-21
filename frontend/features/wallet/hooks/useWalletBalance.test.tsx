import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { UserProvider } from "@/shared/user/UserProvider";
import { ApiRequestError } from "@/shared/api";
import { RATE_LIMIT_EVENT } from "@/shared/rate-limit/types";
import { useWalletBalance } from "./useWalletBalance";

const getBalance = vi.fn();
// The real production contract: the client never holds a JWT, it probes
// GET /users/me against the HttpOnly session cookie to learn auth status.
const getMe = vi.fn(() =>
  Promise.resolve({ id: "user-1", email: "sara@poulix.test" }),
);

vi.mock("@/shared/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return {
    ...actual,
    api: {
      ...actual.api,
      getBalance: (...args: unknown[]) => getBalance(...args),
      getMe: (...args: unknown[]) => getMe(...args),
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <UserProvider>{children}</UserProvider>
    </LanguageProvider>
  );
}

describe("useWalletBalance rate limit", () => {
  beforeEach(() => {
    getBalance.mockReset();
    getMe.mockReset();
    getMe.mockResolvedValue({ id: "user-1", email: "sara@poulix.test" });
    sessionStorage.removeItem("poulix_wallet_last_balance");
    sessionStorage.removeItem("poulix_wallet_last_balance:user-1");
  });

  it("keeps the last amount during a 429 and refetches after the window expires", async () => {
    getBalance
      .mockResolvedValueOnce({ balance: 42_000, currency: "IRR" })
      .mockRejectedValueOnce(new ApiRequestError("Too many requests", 429, 2))
      .mockResolvedValueOnce({ balance: 99_000, currency: "IRR" });

    const { result } = renderHook(() => useWalletBalance(), { wrapper });

    await waitFor(() => expect(result.current.balance).toBe(42_000));

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.balance).toBe(42_000);
    expect(result.current.status).toBe("ready");
    expect(result.current.error).toBeNull();

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(RATE_LIMIT_EVENT, {
          detail: { type: "expired", action: "global" },
        }),
      );
    });

    await waitFor(() => expect(result.current.balance).toBe(99_000));
    expect(getBalance).toHaveBeenCalledTimes(3);
  });

  it("shows the last saved amount instead of 0 when the first load is rate-limited", async () => {
    sessionStorage.setItem(
      "poulix_wallet_last_balance:user-1",
      JSON.stringify({ balance: 88_000, currency: "IRR" }),
    );
    getBalance.mockRejectedValueOnce(
      new ApiRequestError("Too many requests", 429, 2),
    );

    const { result } = renderHook(() => useWalletBalance(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.balance).toBe(88_000);
    expect(result.current.error).toBeNull();
  });

  it("uses demo balance only after auth is unauthenticated and never persists it", async () => {
    getMe.mockRejectedValue(new ApiRequestError("Unauthorized", 401));

    const { result } = renderHook(() => useWalletBalance(), { wrapper });

    expect(result.current.balance).toBeNull();
    await waitFor(() =>
      expect(result.current.status).toBe("unauthenticated"),
    );
    expect(result.current.balance).toBe(17_500_000);
    expect(getBalance).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("poulix_wallet_last_balance")).toBeNull();
    expect(
      sessionStorage.getItem("poulix_wallet_last_balance:user-1"),
    ).toBeNull();
  });

  it("loads authenticated API balance instead of demo data", async () => {
    getBalance.mockResolvedValue({ balance: 42_000, currency: "IRR" });

    const { result } = renderHook(() => useWalletBalance(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.balance).toBe(42_000);
    expect(getBalance).toHaveBeenCalled();
  });
});
