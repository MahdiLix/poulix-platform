"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { cn } from "@/shared/cn";

type AppShellProps = {
  children: ReactNode;
  showBottomNav?: boolean;
  variant?: "default" | "hero";
  className?: string;
};

export function AppShell({
  children,
  showBottomNav = true,
  variant = "default",
  className,
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-canvas text-foreground lg:p-8">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background md:max-w-xl lg:min-h-[calc(100vh-4rem)] lg:max-w-7xl lg:flex-row lg:gap-8 lg:bg-transparent">
        <DesktopSidebar />
        <main
          className={cn(
            "relative flex flex-1 flex-col bg-background lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:shadow-sm",
            variant === "hero" && "bg-primary-strong",
            className,
          )}
        >
          <div className="flex flex-1 flex-col">{children}</div>
          {showBottomNav && <BottomNav />}
        </main>
      </div>
    </div>
  );
}
