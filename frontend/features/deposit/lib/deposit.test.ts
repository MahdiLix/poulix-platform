import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingStartPay,
  PENDING_STARTPAY_KEY,
  readPendingStartPay,
  resumePendingStartPay,
  startZarinpalDeposit,
} from "@/features/deposit/lib/deposit";

const assign = vi.fn();

vi.mock("@/shared/api", () => ({
  api: {
    deposit: vi.fn(),
  },
}));

import { api } from "@/shared/api";

const messages = {
  pleaseSignInToDeposit: "Please sign in to deposit funds",
  depositNoPaymentUrl: "Deposit request did not return a ZarinPal payment URL",
} as never;

const validPending = {
  paymentId: "pay-1",
  authority: "Sauthority123",
  paymentUrl: "https://sandbox.zarinpal.com/pg/StartPay/Sauthority123",
  userId: "user-1",
};

describe("pending StartPay retry", () => {
  beforeEach(() => {
    assign.mockReset();
    vi.stubGlobal("location", { assign });
    sessionStorage.clear();
    vi.mocked(api.deposit).mockReset();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("stores the returned StartPay URL and redirects without creating another payment", async () => {
    vi.mocked(api.deposit).mockResolvedValue({
      paymentId: "pay-1",
      authority: "Sauthority123",
      paymentUrl: validPending.paymentUrl,
      amount: 100_000,
    });

    await startZarinpalDeposit(100_000, messages, true, "user-1");

    expect(api.deposit).toHaveBeenCalledOnce();
    expect(readPendingStartPay("user-1")).toEqual(validPending);
    expect(assign).toHaveBeenCalledWith(validPending.paymentUrl);
  });

  it("resumes the stored URL without calling deposit again", async () => {
    sessionStorage.setItem(PENDING_STARTPAY_KEY, JSON.stringify(validPending));

    expect(resumePendingStartPay("user-1")).toBe(true);
    expect(api.deposit).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith(validPending.paymentUrl);
  });

  it("replaces an older pending payment when a new deposit starts", async () => {
    sessionStorage.setItem(PENDING_STARTPAY_KEY, JSON.stringify(validPending));
    vi.mocked(api.deposit).mockResolvedValue({
      paymentId: "pay-2",
      authority: "Sauthority999",
      paymentUrl: "https://sandbox.zarinpal.com/pg/StartPay/Sauthority999",
      amount: 200_000,
    });

    await startZarinpalDeposit(200_000, messages, true, "user-1");

    expect(readPendingStartPay("user-1")).toEqual({
      paymentId: "pay-2",
      authority: "Sauthority999",
      paymentUrl: "https://sandbox.zarinpal.com/pg/StartPay/Sauthority999",
      userId: "user-1",
    });
  });

  it("ignores a pending StartPay belonging to another user", () => {
    sessionStorage.setItem(PENDING_STARTPAY_KEY, JSON.stringify(validPending));
    expect(readPendingStartPay("user-2")).toBeNull();
    expect(sessionStorage.getItem(PENDING_STARTPAY_KEY)).toBeNull();
  });

  it("rejects a tampered non-ZarinPal URL", () => {
    sessionStorage.setItem(
      PENDING_STARTPAY_KEY,
      JSON.stringify({
        ...validPending,
        paymentUrl: "https://evil.example/pg/StartPay/Sauthority123",
      }),
    );
    expect(readPendingStartPay("user-1")).toBeNull();
    expect(resumePendingStartPay("user-1")).toBe(false);
    expect(assign).not.toHaveBeenCalled();
  });

  it("clears the pending StartPay after the gateway returns", () => {
    sessionStorage.setItem(PENDING_STARTPAY_KEY, JSON.stringify(validPending));
    clearPendingStartPay();
    expect(readPendingStartPay("user-1")).toBeNull();
  });
});
