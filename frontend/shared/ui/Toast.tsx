"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { cn } from "@/shared/cn";

export type ToastVariant = "success" | "danger" | "warning" | "info";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastInput & {
  id: string;
  leaving?: boolean;
};

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const FLASH_KEY = "poulix_flash_toast";

export function flashToast(toast: ToastInput) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(FLASH_KEY, JSON.stringify(toast));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) =>
      current.map((item) =>
        item.id === id ? { ...item, leaving: true } : item,
      ),
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 280);
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const next: ToastItem = {
        id,
        variant: "success",
        duration: 4200,
        ...toast,
      };
      setToasts((current) => [...current.slice(-2), next]);
      window.setTimeout(() => removeToast(id), next.duration ?? 4200);
    },
    [removeToast],
  );

  useEffect(() => {
    const raw = window.sessionStorage.getItem(FLASH_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(FLASH_KEY);
    try {
      const parsed = JSON.parse(raw) as ToastInput;
      if (parsed?.title) pushToast(parsed);
    } catch {
      // ignore malformed flash payloads
    }
  }, [pathname, pushToast]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 sm:top-6">
        <div className="flex w-full max-w-md flex-col gap-2">
          {toasts.map((toast) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: () => void;
}) {
  const Icon =
    toast.variant === "danger"
      ? CircleAlert
      : toast.variant === "warning"
        ? CircleAlert
        : toast.variant === "info"
          ? Info
          : CheckCircle2;

  const tone =
    toast.variant === "danger"
      ? "border-danger/40 bg-surface text-danger"
      : toast.variant === "warning"
        ? "border-warning/40 bg-surface text-warning"
        : toast.variant === "info"
          ? "border-primary/30 bg-surface text-primary"
          : "border-primary/30 bg-surface text-primary";

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-[14px] border p-3.5 shadow-[var(--shadow-card)]",
        tone,
        toast.leaving ? "toast-leave" : "toast-enter",
      )}
      role="status"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground">{toast.title}</p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {toast.description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
