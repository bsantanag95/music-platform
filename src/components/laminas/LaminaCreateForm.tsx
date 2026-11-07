"use client";

import { useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createLamina } from "@/lib/api/laminas";

// Alta de una Lámina: lo mínimo para llegar al editor, donde se arma.

const FORMATS = ["top5", "top10", "grid9"] as const;
const ENTITY_TYPES = ["release-group", "recording"] as const;
const field = "rounded border border-ink-border bg-ink px-3 py-2 font-body text-sm text-paper";

export function LaminaCreateForm() {
  const t = useTranslations("laminas");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("top5");
  const [entityType, setEntityType] = useState<(typeof ENTITY_TYPES)[number]>("release-group");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    setFailed(false);
    try {
      const lamina = await createLamina({ title: title.trim(), format, entityType });
      router.push(`/me/laminas/${lamina.id}`);
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4">
      <h2 className="font-display text-base text-paper">{t("create.heading")}</h2>
      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("fields.title")}
        <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder={t("create.titlePlaceholder")} className={field} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("fields.format")}
          <select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className={field}>
            {FORMATS.map((option) => (
              <option key={option} value={option}>
                {t(`formats.${option}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
          {t("fields.entityType")}
          <select value={entityType} onChange={(event) => setEntityType(event.target.value as typeof entityType)} className={field}>
            {ENTITY_TYPES.map((option) => (
              <option key={option} value={option}>
                {t(`entityTypes.${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="self-start rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-50"
      >
        {t("create.submit")}
      </button>
    </form>
  );
}
