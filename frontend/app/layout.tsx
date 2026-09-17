import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { UserProvider } from "@/shared/user/UserProvider";
import { ToastProvider } from "@/shared/ui/Toast";
import { RateLimitProvider } from "@/shared/rate-limit";
import {
  LANGUAGE_COOKIE,
  languageDirection,
  parseLanguageCookie,
} from "@/shared/i18n/language-cookie";
import {
  THEME_COOKIE,
  parseThemeCookie,
  themeClassName,
} from "@/shared/theme/theme-cookie";
import { UI_BOOT_SCRIPT } from "@/shared/preferences/ui-boot-script";
import { loadLayoutSession } from "@/shared/user/get-session-user";
import { cn } from "@/shared/cn";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
});

export const metadata: Metadata = {
  title: "Poulix",
  description:
    "Poulix is a personal digital wallet for deposits, transfers, goals, envelopes, and more.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/poulix-logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/poulix-logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2b6beb",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const cookieStore = await cookies();
  const language = parseLanguageCookie(cookieStore.get(LANGUAGE_COOKIE)?.value);
  const theme = parseThemeCookie(cookieStore.get(THEME_COOKIE)?.value);
  const dir = languageDirection(language);
  const themeClass = themeClassName(theme);
  const { user } = await loadLayoutSession();

  return (
    <html
      lang={language}
      dir={dir}
      suppressHydrationWarning
      className={cn(
        geistSans.variable,
        geistMono.variable,
        vazirmatn.variable,
        "h-full antialiased",
        language === "fa" && "rtl",
        themeClass,
      )}
      style={{ colorScheme: theme }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: UI_BOOT_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-full bg-canvas font-sans text-foreground">
        <ThemeProvider initialTheme={theme}>
          <LanguageProvider initialLanguage={language}>
            <UserProvider initialUser={user}>
              <ToastProvider>
                <RateLimitProvider>{children}</RateLimitProvider>
              </ToastProvider>
            </UserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
