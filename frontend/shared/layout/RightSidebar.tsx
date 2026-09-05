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
        "hidden w-[300px] shrink-0 flex-col gap-6 overflow-y-auto bg-background p-5 xl:flex",
        className,
      )}
    >
      {children}
    </aside>
  );
}
