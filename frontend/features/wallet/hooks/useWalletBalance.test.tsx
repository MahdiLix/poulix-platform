import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { ApiRequestError } from "@/shared/api";
import { RATE_LIMIT_EVENT } from "@/shared/rate-limit/types";
import { useWalletBalance } from "./useWalletBalance";

const getBalance = vi.fn();
const getStoredToken = vi.fn(() => "token");

vi.mock("@/shared/api", async () => {
  const actual =
    await vi.importActual<typeof import("@/shared/api")>("@/shared/api");
  return {
    ...actual,
    getStoredToken: () => getStoredToken(),
    api: {
      ...actual.api,
      getBalance: (...args: unknown[]) => getBalance(...args),
    },
  };
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

describe("useWalletBalance rate limit", () => {
  beforeEach(() => {
    getBalance.mockReset();
    getStoredToken.mockReturnValue("token");
    sessionStorage.removeItem("poulix_wallet_last_balance");
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
      "poulix_wallet_last_balance",
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
});
