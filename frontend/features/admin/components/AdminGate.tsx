"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (!getStoredToken()) {
        router.replace("/login");
        return;
      }

      try {
        const me = await api.getMe();
        if (cancelled) return;
        if (me?.role !== "ADMIN") {
          router.replace("/");
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) {
          router.replace("/login");
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm font-semibold text-muted">
        {t.admin.checkingAccess}
      </div>
    );
  }

  return <>{children}</>;
}
