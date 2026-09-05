import type { ReactNode } from "react";
import { cn } from "@/shared/cn";

type PageContentProps = {
  children: ReactNode;
  className?: string;
  width?: "narrow" | "default" | "wide";
};

const widths = {
  narrow: "lg:max-w-xl",
  default: "lg:max-w-5xl",
  wide: "lg:max-w-6xl",
};

export function PageContent({
  children,
  className,
  width = "default",
}: PageContentProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-1 flex-col space-y-6 p-4 lg:p-6",
        widths[width],
        className,
      )}
    >
      {children}
    </div>
  );
}
