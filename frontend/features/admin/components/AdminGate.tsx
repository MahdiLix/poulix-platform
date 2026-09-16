"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { PageSpinner } from "@/shared/ui/Spinner";
import { api } from "@/shared/api";
import { useUser } from "@/shared/user/UserProvider";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

export function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { status: authStatus } = useUser();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      if (authStatus === "loading") return;
      if (authStatus === "unauthenticated") {
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
  }, [router, authStatus]);

  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <PageSpinner label={t.admin.checkingAccess} />
      </div>
    );
  }

  return <>{children}</>;
}
