import Image from "next/image";
import { cn } from "@/shared/cn";

export function WalletIllustration({
  className,
  priority = false,
  variant = "cluster",
}: {
  className?: string;
  priority?: boolean;
  variant?: "cluster" | "banner";
}) {
  const isBanner = variant === "banner";

  return (
    <div
      className={cn("pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      <Image
        src={isBanner ? "/hero-banner-wide.png" : "/hero-art-cluster.png"}
        alt=""
        fill
        priority={priority}
        sizes={
          isBanner
            ? "(max-width: 768px) 100vw, 70vw"
            : "(max-width: 768px) 55vw, 32vw"
        }
        className={
          isBanner
            ? "object-cover object-right rtl:object-left"
            : "object-contain object-center"
        }
      />
    </div>
  );
}
