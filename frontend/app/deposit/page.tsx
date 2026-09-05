"use client";

import { Gift, ShieldCheck } from "lucide-react";
import { AppShell } from "@/shared/layout/AppShell";
import { HeaderBar } from "@/shared/layout/HeaderBar";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { DepositForm } from "@/features/deposit/components/DepositForm";
import { useLanguage } from "@/shared/i18n/LanguageProvider";

const steps = [
  {
    step: 1,
    title: "Request payment",
    description: "Choose or enter an amount to top up.",
  },
  {
    step: 2,
    title: "Pay on ZarinPal",
    description: "Complete the secure sandbox payment.",
  },
  {
    step: 3,
    title: "Wallet credited",
    description: "Your balance updates after verification.",
  },
];

export default function DepositPage() {
  const { t } = useLanguage();

  return (
    <AppShell showBottomNav={false}>
      <HeaderBar
        title={t.deposit.depositTitle}
        backHref="/"
        subtitle={t.deposit.addMoneySub}
      />

      <div className="flex-1 p-4 lg:p-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div id="deposit-form" className="lg:col-span-2">
            <Card className="p-6">
              <DepositForm />
            </Card>
          </div>

          <div className="hidden md:block md:col-span-2 lg:col-span-1">
            <div className="space-y-6">
              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-foreground">
                  How it works
                </h3>
                <div className="space-y-1">
                  {steps.map((item, index) => (
                    <div key={item.step} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-white">
                          {item.step}
                        </div>
                        {index < steps.length - 1 && (
                          <div className="mt-1 h-full w-px border-l border-dashed border-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Secure & trustworthy
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      No card data is stored locally. All payments are processed
                      securely through ZarinPal.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="relative overflow-hidden rounded-[14px] border border-warning/35 bg-promo-gradient p-5 text-foreground shadow-[var(--shadow-card)]">
                <Badge variant="warning" className="mb-3">
                  Limited time
                </Badge>
                <p className="max-w-[70%] text-sm font-bold text-foreground">
                  Get up to 20% bonus cashback
                </p>
                <p className="mt-1 max-w-[70%] text-xs text-foreground/75">
                  on your next wallet top up.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4 w-auto"
                  onClick={() => {
                    document
                      .getElementById("deposit-form")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Top Up Now
                </Button>
                <div className="absolute -bottom-3 -end-3 opacity-90">
                  <Gift className="h-24 w-24 text-warning/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
