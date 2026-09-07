"use client";

import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { TopBar } from "./TopBar";
import { RightSidebar } from "./RightSidebar";
import { cn } from "@/shared/cn";

type AppShellProps = {
  children: ReactNode;
  showBottomNav?: boolean;
  variant?: "default" | "hero" | "dashboard";
  className?: string;
  rightPanel?: ReactNode;
  showTopBar?: boolean;
  showSearch?: boolean;
};

export function AppShell({
  children,
  showBottomNav = true,
  variant = "default",
  className,
  rightPanel,
  showTopBar = false,
  showSearch = true,
}: AppShellProps) {
  const isDashboard = variant === "dashboard";

  return (
    <div className="h-dvh overflow-hidden bg-canvas text-foreground">
      <div className="mx-auto flex h-full w-full flex-col lg:flex-row">
        <DesktopSidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {showTopBar || isDashboard ? (
            <TopBar showSearch={showSearch} className="shrink-0" />
          ) : null}

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main
              className={cn(
                "dashboard-canvas relative flex min-h-0 flex-1 flex-col overflow-y-auto",
                className,
              )}
            >
              <div className="flex flex-1 flex-col">{children}</div>
              {showBottomNav && <BottomNav />}
            </main>

            {rightPanel ? <RightSidebar>{rightPanel}</RightSidebar> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
