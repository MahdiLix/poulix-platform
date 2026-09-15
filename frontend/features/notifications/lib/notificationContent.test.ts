import { describe, expect, it } from "vitest";
import {
  notificationContent,
  notificationDisplayCategory,
} from "./notificationContent";
import { en } from "@/shared/i18n/messages/en";
import { fa } from "@/shared/i18n/messages/fa";
import type { Notification } from "./notifications";

function notification(
  type: Notification["type"],
  metadata: Record<string, unknown> | null = null,
): Notification {
  return {
    id: "n1",
    type,
    category: type === "SECURITY_WARNING" ? "WARNING" : "INFO",
    metadata,
    readAt: null,
    createdAt: new Date().toISOString(),
    isRead: false,
  };
}

describe("notificationContent", () => {
  it("does not present a successful new-device login as a security alert", () => {
    const content = notificationContent(
      notification("ACCOUNT_EVENT", { reason: "NEW_DEVICE_LOGIN" }),
      en,
    );

    expect(content.title.toLowerCase()).not.toContain("security");
    expect(content.title).toBe("Signed in from a new device");
  });

  it("keeps legacy new-device rows out of the security-alert copy", () => {
    const english = notificationContent(
      notification("SECURITY_WARNING", { reason: "NEW_DEVICE_LOGIN" }),
      en,
    );
    const persian = notificationContent(
      notification("SECURITY_WARNING", { reason: "NEW_DEVICE_LOGIN" }),
      fa,
    );

    expect(english.title).not.toBe(
      en.notifications.types.SECURITY_WARNING.title,
    );
    expect(persian.title).not.toBe("هشدار امنیتی");
    expect(persian.title).toBe("ورود از دستگاه جدید");
  });

  it("uses a security category message for failed logins", () => {
    const content = notificationContent(
      notification("SECURITY_WARNING", { reason: "FAILED_LOGIN" }),
      en,
    );

    expect(content.title).toBe("Failed sign-in attempt");
  });

  it("does not use the warning category for a new-device login", () => {
    expect(
      notificationDisplayCategory(
        notification("SECURITY_WARNING", { reason: "NEW_DEVICE_LOGIN" }),
      ),
    ).toBe("INFO");
  });

  it("keeps financial deposit copy in the payment category", () => {
    const content = notificationContent(
      {
        ...notification("DEPOSIT_SUCCESS", { amount: 1000, currency: "IRR" }),
        category: "SUCCESS",
      },
      en,
    );

    expect(content.title).toBe("Deposit Successful");
  });
});
