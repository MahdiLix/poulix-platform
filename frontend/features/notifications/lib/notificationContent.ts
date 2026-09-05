import { formatIrr } from "@/features/wallet/lib/wallet";
import type { TranslationDictionary } from "@/shared/i18n/translations";
import type { Notification, NotificationType } from "./notifications";

function metadataAmount(
  metadata: Record<string, unknown> | null,
  currency = "IRR",
) {
  const amount = metadata?.amount;
  if (typeof amount !== "number") {
    return "";
  }
  return formatIrr(amount, currency);
}

function metadataString(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : "";
}

export function notificationContent(
  notification: Notification,
  t: TranslationDictionary,
) {
  const metadata = notification.metadata;
  const currency =
    typeof metadata?.currency === "string" ? metadata.currency : "IRR";
  const amountText = metadataAmount(metadata, currency);
  const types = t.notifications.types;

  switch (notification.type) {
    case "DEPOSIT_SUCCESS":
      return {
        title: types.DEPOSIT_SUCCESS.title,
        message: types.DEPOSIT_SUCCESS.message.replace("{amount}", amountText),
      };
    case "WITHDRAWAL_SUCCESS":
      return {
        title: types.WITHDRAWAL_SUCCESS.title,
        message: types.WITHDRAWAL_SUCCESS.message.replace(
          "{amount}",
          amountText,
        ),
      };
    case "TRANSFER_SUCCESS":
      return {
        title: types.TRANSFER_SUCCESS.title,
        message: types.TRANSFER_SUCCESS.message
          .replace("{amount}", amountText)
          .replace("{name}", metadataString(metadata, "recipientUsername")),
      };
    case "TRANSFER_RECEIVED":
      return {
        title: types.TRANSFER_RECEIVED.title,
        message: types.TRANSFER_RECEIVED.message
          .replace("{amount}", amountText)
          .replace("{name}", metadataString(metadata, "senderUsername")),
      };
    case "TRANSFER_FAILED":
      return {
        title: types.TRANSFER_FAILED.title,
        message: types.TRANSFER_FAILED.message
          .replace("{amount}", amountText)
          .replace(
            "{name}",
            metadataString(metadata, "recipientUsername") || "user",
          ),
      };
    case "SCHEDULED_PAYMENT_SUCCESS":
      return {
        title: types.SCHEDULED_PAYMENT_SUCCESS.title,
        message: types.SCHEDULED_PAYMENT_SUCCESS.message
          .replace("{amount}", amountText)
          .replace("{name}", metadataString(metadata, "recipientUsername")),
      };
    case "SCHEDULED_PAYMENT_FAILED":
      return {
        title: types.SCHEDULED_PAYMENT_FAILED.title,
        message: types.SCHEDULED_PAYMENT_FAILED.message
          .replace("{amount}", amountText)
          .replace("{name}", metadataString(metadata, "recipientUsername")),
      };
    case "GOAL_PROGRESS": {
      const saved = metadata?.savedAmount;
      const target = metadata?.targetAmount;
      const savedText =
        typeof saved === "number" ? formatIrr(saved, currency) : "";
      const targetText =
        typeof target === "number" ? formatIrr(target, currency) : "";
      return {
        title: types.GOAL_PROGRESS.title,
        message: types.GOAL_PROGRESS.message
          .replace("{goal}", metadataString(metadata, "goalTitle"))
          .replace("{amount}", amountText)
          .replace("{saved}", savedText)
          .replace("{target}", targetText),
      };
    }
    case "GOAL_COMPLETED":
      return {
        title: types.GOAL_COMPLETED.title,
        message: types.GOAL_COMPLETED.message
          .replace("{goal}", metadataString(metadata, "goalTitle"))
          .replace(
            "{target}",
            metadataAmount(
              {
                amount:
                  typeof metadata?.targetAmount === "number"
                    ? metadata.targetAmount
                    : 0,
                currency,
              },
              currency,
            ),
          ),
      };
    case "ACCOUNT_EVENT":
      return {
        title: types.ACCOUNT_EVENT.title,
        message: types.ACCOUNT_EVENT.message,
      };
    case "SECURITY_WARNING":
      return {
        title: types.SECURITY_WARNING.title,
        message: types.SECURITY_WARNING.message,
      };
    case "SPENDING_LIMIT_WARNING":
      return {
        title: types.SPENDING_LIMIT_WARNING.title,
        message: types.SPENDING_LIMIT_WARNING.message,
      };
    default:
      const fallbackType = notification.type as NotificationType;
      return {
        title: fallbackType,
        message: "",
      };
  }
}

export function notificationCategoryClass(category: Notification["category"]) {
  switch (category) {
    case "SUCCESS":
      return "bg-primary-soft text-primary";
    case "WARNING":
      return "bg-warning-soft text-warning";
    case "ERROR":
      return "bg-danger-soft text-danger";
    default:
      return "bg-surface-muted text-muted";
  }
}
