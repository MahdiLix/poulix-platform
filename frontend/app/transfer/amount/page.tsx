"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SendMoneyPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/send");
  }, [router]);

  return <div className="p-8 text-center text-muted">Loading...</div>;
}
