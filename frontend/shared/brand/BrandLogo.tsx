import Image from "next/image";
import { cn } from "@/shared/cn";

type BrandLogoProps = {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = 40,
  className,
  alt = "Poulix",
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/poulix-logo.png"
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={cn(
        "shrink-0 rounded-xl object-cover shadow-sm shadow-primary/20",
        className,
      )}
    />
  );
}
