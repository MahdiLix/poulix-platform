import type { Language } from "@/shared/i18n/translations";

export type SearchRole = "USER" | "ADMIN";
export type SearchScope = "app" | "admin";

export type SearchRoute = {
  href: string;
  roles: readonly SearchRole[];
  scope: SearchScope;
  label: Record<Language, string>;
  keywords: Record<Language, readonly string[]>;
};

export const SEARCH_ROUTES: readonly SearchRoute[] = [
  route(
    "/",
    "app",
    ["USER", "ADMIN"],
    "Home",
    "خانه",
    ["wallet", "overview"],
    ["کیف پول", "نمای کلی"],
  ),
  route(
    "/deposit",
    "app",
    ["USER", "ADMIN"],
    "Top up wallet",
    "افزایش موجودی",
    ["deposit", "zarinpal", "add money"],
    ["واریز", "زرین پال"],
  ),
  route(
    "/send",
    "app",
    ["USER", "ADMIN"],
    "Send money",
    "ارسال پول",
    ["transfer", "recipient"],
    ["انتقال", "گیرنده"],
  ),
  route(
    "/transfer",
    "app",
    ["USER", "ADMIN"],
    "Withdraw",
    "برداشت",
    ["bank", "shaba"],
    ["بانک", "شبا"],
  ),
  route(
    "/history",
    "app",
    ["USER", "ADMIN"],
    "Transaction history",
    "تاریخچه تراکنش‌ها",
    ["activity", "payments"],
    ["فعالیت", "پرداخت"],
  ),
  route(
    "/notifications",
    "app",
    ["USER", "ADMIN"],
    "Notifications",
    "اعلان‌ها",
    ["notification", "alerts", "inbox"],
    ["اعلان", "هشدار", "صندوق"],
  ),
  route(
    "/statistics",
    "app",
    ["USER", "ADMIN"],
    "Statistics",
    "آمار مالی",
    ["charts", "spending"],
    ["نمودار", "هزینه"],
  ),
  route(
    "/scheduled",
    "app",
    ["USER", "ADMIN"],
    "Scheduled payments",
    "پرداخت‌های زمان‌بندی‌شده",
    ["recurring", "automatic"],
    ["دوره‌ای", "خودکار"],
  ),
  route(
    "/goals",
    "app",
    ["USER", "ADMIN"],
    "Saving goals",
    "اهداف پس‌انداز",
    ["savings", "targets"],
    ["پس انداز", "هدف"],
  ),
  route(
    "/envelopes",
    "app",
    ["USER", "ADMIN"],
    "Virtual envelopes",
    "کیف‌های مجازی",
    ["budget", "allocation"],
    ["بودجه", "تخصیص"],
  ),
  route(
    "/destinations",
    "app",
    ["USER", "ADMIN"],
    "Saved destinations",
    "مقاصد ذخیره‌شده",
    ["contacts", "accounts"],
    ["مخاطبین", "حساب‌ها"],
  ),
  route(
    "/profile",
    "app",
    ["USER", "ADMIN"],
    "Profile and settings",
    "پروفایل و تنظیمات",
    ["account", "preferences"],
    ["حساب", "ترجیحات"],
  ),
  route(
    "/security",
    "app",
    ["USER", "ADMIN"],
    "Security and limits",
    "امنیت و محدودیت‌ها",
    ["sessions", "spending limits"],
    ["نشست‌ها", "سقف هزینه"],
  ),
  route(
    "/admin",
    "admin",
    ["ADMIN"],
    "Admin dashboard",
    "داشبورد مدیریت",
    ["overview", "platform"],
    ["نمای کلی", "پلتفرم"],
  ),
  route(
    "/admin/users",
    "admin",
    ["ADMIN"],
    "Users",
    "کاربران",
    ["accounts", "members"],
    ["حساب‌ها", "اعضا"],
  ),
  route(
    "/admin/transactions",
    "admin",
    ["ADMIN"],
    "Transactions",
    "تراکنش‌ها",
    ["money", "monitor"],
    ["مالی", "نظارت"],
  ),
  route(
    "/admin/payments",
    "admin",
    ["ADMIN"],
    "Payments",
    "پرداخت‌ها",
    ["gateway", "zarinpal"],
    ["درگاه", "زرین پال"],
  ),
  route(
    "/admin/withdrawals",
    "admin",
    ["ADMIN"],
    "Withdrawals",
    "برداشت‌ها",
    ["settlement", "bank"],
    ["تسویه", "بانک"],
  ),
  route(
    "/admin/security",
    "admin",
    ["ADMIN"],
    "Security monitoring",
    "نظارت امنیتی",
    ["alerts", "events"],
    ["هشدارها", "رویدادها"],
  ),
  route(
    "/admin/audit",
    "admin",
    ["ADMIN"],
    "Audit log",
    "گزارش حسابرسی",
    ["actions", "logs"],
    ["عملیات", "لاگ"],
  ),
] as const;

function route(
  href: string,
  scope: SearchScope,
  roles: readonly SearchRole[],
  en: string,
  fa: string,
  enKeywords: readonly string[],
  faKeywords: readonly string[],
): SearchRoute {
  return {
    href,
    scope,
    roles,
    label: { en, fa },
    keywords: { en: enKeywords, fa: faKeywords },
  };
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function resolveSearchRoutes({
  query,
  language,
  role,
  scope,
  limit = 6,
}: {
  query: string;
  language: Language;
  role: SearchRole;
  scope?: SearchScope;
  limit?: number;
}): SearchRoute[] {
  const needle = normalize(query);
  const available = SEARCH_ROUTES.filter(
    (item) => item.roles.includes(role) && (!scope || item.scope === scope),
  );

  if (!needle) return available.slice(0, limit);

  return available
    .map((item) => {
      const labels = [item.label[language], item.label.en, item.label.fa];
      const terms = [
        ...labels,
        ...item.keywords[language],
        ...item.keywords.en,
        ...item.keywords.fa,
      ].map(normalize);
      const score = Math.max(
        ...terms.map((term) =>
          term === needle
            ? 4
            : term.startsWith(needle)
              ? 3
              : term.includes(needle)
                ? 2
                : 0,
        ),
      );
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.label[language].localeCompare(b.item.label[language]),
    )
    .slice(0, limit)
    .map(({ item }) => item);
}
