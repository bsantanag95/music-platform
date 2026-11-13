"use client";

import { useState, type SubmitEventHandler } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { createLamina } from "@/lib/api/laminas";
import { manualTitleSuggestions, suggestLaminaTitle, type TitleTranslator } from "@/lib/laminas/suggested-title";
import { FIELD, SEGMENT_ROW, segmentOption } from "./form-parts";
import { LaminaSourcePanel, LaminaSourceTabs } from "./LaminaSourcePanel";
import { useLaminaSource } from "./use-lamina-source";

// Alta de una Lámina: a mano lleva al editor vacío; desde una fuente, llega con los ítems y un título sugerido.

const FORMATS = ["top5", "top10", "grid9"] as const;
const ENTITY_TYPES = ["release-group", "recording"] as const;
const SOURCES = ["manual", "ratings", "favorites", "list"] as const;
const CAPACITY = { top5: 5, top10: 10, grid9: 9 } as const;

/** Lo que hereda de una Lámina ajena con "Arma la tuya": nunca sus ítems, y el título solo como sugerencia. */
export interface LaminaFormInspiration {
  id: string;
  title: string;
  format: (typeof FORMATS)[number];
  entityType: (typeof ENTITY_TYPES)[number];
  ownerUsername: string;
}

export function LaminaCreateForm({ currentYear, inspiration = null }: { currentYear: number; inspiration?: LaminaFormInspiration | null }) {
  const t = useTranslations("laminas");
  const router = useRouter();
  // `null` mientras la persona no lo toca: hasta entonces el título sigue a los filtros.
  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [format, setFormat] = useState<(typeof FORMATS)[number]>(inspiration?.format ?? "top5");
  const [entityType, setEntityType] = useState<(typeof ENTITY_TYPES)[number]>(inspiration?.entityType ?? "release-group");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = useLaminaSource({ entityType, slots: CAPACITY[format] });

  const translate = t as unknown as TitleTranslator;
  const chosenSource = source.source;
  const manual = chosenSource === "manual";
  const suggestion = chosenSource === "manual" ? "" : suggestLaminaTitle(translate, { format, entityType, source: chosenSource, ...source.labels });
  const title = editedTitle ?? suggestion;
  const ready = Boolean(title.trim()) && (manual || source.selected.length > 0);
  const chips = [
    ...new Set([...(inspiration ? [inspiration.title] : []), ...(manual ? manualTitleSuggestions(translate, { format, entityType, year: currentYear }) : [])]),
  ];

  const submit: SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setPending(true);
    setFailed(false);
    try {
      const targetIds = manual ? undefined : source.selected.map((candidate) => candidate.target.id);
      const lamina = await createLamina({ title: title.trim(), format, entityType, targetIds });
      router.push(`/me/cards/${lamina.id}`);
    } catch {
      setFailed(true);
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded border border-ink-border bg-ink-surface p-4">
      <h2 className="font-display text-base text-paper">{t("create.heading")}</h2>
      {inspiration ? (
        <Link
          href={`/users/${encodeURIComponent(inspiration.ownerUsername)}/cards/${inspiration.id}`}
          className="self-start font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("create.inspired", { username: inspiration.ownerUsername })}
        </Link>
      ) : null}
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <fieldset className="flex flex-col gap-1">
          <legend className="font-data text-xs text-paper-muted">{t("fields.entityType")}</legend>
          <div className={SEGMENT_ROW}>
            {ENTITY_TYPES.map((option) => (
              <button key={option} type="button" aria-pressed={entityType === option} onClick={() => setEntityType(option)} className={segmentOption(entityType === option)}>
                {t(`entityTypes.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-1">
          <legend className="font-data text-xs text-paper-muted">{t("fields.format")}</legend>
          <div className={SEGMENT_ROW}>
            {FORMATS.map((option) => (
              <button key={option} type="button" aria-pressed={format === option} onClick={() => setFormat(option)} className={segmentOption(format === option)}>
                {t(`formats.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <LaminaSourceTabs source={source.source} options={SOURCES} onChange={source.setSource} />
      <LaminaSourcePanel state={source} rankStart={format === "grid9" ? null : 1} />
      <label className="flex flex-col gap-1 font-data text-xs text-paper-muted">
        {t("fields.title")}
        <input
          value={title}
          onChange={(event) => setEditedTitle(event.target.value)}
          maxLength={100} placeholder={t("create.titlePlaceholder", { n: CAPACITY[format], kind: entityType, year: currentYear })}
          className={FIELD}
        />
      </label>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((suggested) => (
            <button
              key={suggested}
              type="button"
              onClick={() => setEditedTitle(suggested)}
              className="min-h-9 rounded border border-ink-border px-3 py-1 font-data text-xs text-paper-muted transition-colors hover:text-paper"
            >
              {suggested}
            </button>
          ))}
        </div>
      ) : null}
      {manual ? null : <p className="font-data text-xs text-paper-muted">{t("source.privateNote")}</p>}
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !ready}
        className="self-start rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-50"
      >
        {pending ? t("create.pending") : t("create.submit")}
      </button>
    </form>
  );
}
