"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import { api, getStoredToken } from "@/shared/api";
import { useLanguage } from "@/shared/i18n/LanguageProvider";
import { localizeError } from "@/shared/i18n/localizeError";
import { validateEnvelopeName } from "@/features/envelopes/lib/envelopes";

export function CreateEnvelopeForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (!getStoredToken()) {
      router.push("/login");
      return;
    }

    const nameError = validateEnvelopeName(name, t.messages);
    if (nameError) {
      setFieldError(nameError);
      return;
    }

    setLoading(true);

    try {
      const envelope = await api.createEnvelope({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.push(`/envelopes/${envelope.id}`);
    } catch (err) {
      setError(localizeError(err, t.messages, "envelopeCreateFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <TextField
        label={t.envelopes.envelopeName}
        placeholder={t.envelopes.envelopeNamePlaceholder}
        value={name}
        error={fieldError}
        onChange={(e) => {
          setName(e.target.value);
          setFieldError(null);
          setError("");
        }}
      />

      <TextField
        label={t.envelopes.descriptionOptional}
        placeholder={t.envelopes.descriptionPlaceholder}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      {error ? (
        <div className="rounded-xl bg-danger-soft p-3 text-center text-xs font-semibold text-danger">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t.envelopes.creating : t.envelopes.createBtn}
      </Button>
    </form>
  );
}
