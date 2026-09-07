"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

type RightSidebarProps = {
  children: ReactNode;
  className?: string;
};

export function RightSidebar({ children, className }: RightSidebarProps) {
  return (
    <aside
      className={cn(
        "dashboard-canvas hidden w-[300px] shrink-0 flex-col gap-4 overflow-y-auto border-s border-border-subtle p-4 xl:flex 2xl:w-[330px]",
        className,
      )}
    >
      {children}
    </aside>
  );
}
