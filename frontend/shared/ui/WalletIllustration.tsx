import Image from "next/image";
import { cn } from "@/shared/cn";

export function WalletIllustration({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn("pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      <Image
        src="/hero-wallet-cutout.png"
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 768px) 45vw, 30vw"
        className="object-contain"
      />
    </div>
  );
}
