import type { Metadata } from 'next';
import { Geist, Geist_Mono, Vazirmatn } from 'next/font/google';
import { ThemeProvider } from '@/shared/theme/ThemeProvider';
import { LanguageProvider } from '@/shared/i18n/LanguageProvider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const vazirmatn = Vazirmatn({
  variable: '--font-vazirmatn',
  subsets: ['arabic'],
});

export const metadata: Metadata = {
  title: 'Poulix',
  description: 'Poulix wallet',
};

const themeBootScript = `try{var t=localStorage.getItem('poulix-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;
const langBootScript = `try{var m=document.cookie.match(/poulix_lang=([^;]+)/);if(m&&m[1]==='fa'){document.documentElement.lang='fa';document.documentElement.dir='rtl';document.documentElement.classList.add('rtl')}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${vazirmatn.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootScript + ';' + langBootScript,
          }}
        />
      </head>
      <body className="min-h-full bg-canvas font-sans text-foreground">
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
