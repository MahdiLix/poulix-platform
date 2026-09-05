import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { LanguageProvider } from "@/shared/i18n/LanguageProvider";
import { UserProvider } from "@/shared/user/UserProvider";
import { ToastProvider } from "@/shared/ui/Toast";
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
};

export const viewport: Viewport = {
  themeColor: "#2b6beb",
  width: "device-width",
  initialScale: 1,
};

const langBootScript = `try{var m=document.cookie.match(/poulix_lang=([^;]+)/);if(m&&m[1]==='fa'){document.documentElement.lang='fa';document.documentElement.dir='rtl';document.documentElement.classList.add('rtl')}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: langBootScript,
          }}
        />
      </head>
      <body className="min-h-full bg-canvas font-sans text-foreground">
        <ThemeProvider>
          <LanguageProvider>
            <UserProvider>
              <ToastProvider>{children}</ToastProvider>
            </UserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
