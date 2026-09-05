"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { useToast } from "@/shared/ui/Toast";
import {
  getHomepageOffer,
  saveHomepageOffer,
  type HomepageOffer,
} from "@/features/offers/lib/offers";

export function OfferEditor() {
  const { t } = useLanguage();
  const { pushToast } = useToast();
  const [offer, setOffer] = useState<HomepageOffer>(getHomepageOffer());

  useEffect(() => {
    setOffer(getHomepageOffer());
  }, []);

  function handleSave() {
    saveHomepageOffer(offer);
    pushToast({ title: t.admin.offerSaved });
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold">{t.admin.offerManagement}</h2>
      <TextField
        label={t.admin.offerTitleLabel}
        value={offer.title}
        onChange={(event) =>
          setOffer((current) => ({ ...current, title: event.target.value }))
        }
      />
      <TextField
        label={t.admin.offerDescLabel}
        value={offer.description}
        onChange={(event) =>
          setOffer((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
      />
      <TextField
        label={t.admin.offerPercentLabel}
        type="number"
        inputMode="numeric"
        min="1"
        max="100"
        value={String(offer.percent)}
        onChange={(event) =>
          setOffer((current) => ({
            ...current,
            percent: Number(event.target.value) || 0,
          }))
        }
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={offer.enabled}
          onChange={(event) =>
            setOffer((current) => ({
              ...current,
              enabled: event.target.checked,
            }))
          }
        />
        {t.home.limitedTime}
      </label>
      <Button onClick={handleSave} className="w-auto">
        {t.admin.saveOffer}
      </Button>
    </div>
  );
}
