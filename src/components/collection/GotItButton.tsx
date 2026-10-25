"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { COLLECTION_FORMATS, type CollectionFormat } from "@/services/collection/vocabulary";

// "Lo conseguí" de una variante buscada (openspec: redesign-collection-views, D6). Con formato, un toque basta; si la
// variante busca "cualquier formato", el botón despliega en la fila los cuatro formatos para elegir con cuál llegó.
export function GotItButton({
  format,
  busy,
  onGotIt,
}: {
  format: CollectionFormat | null;
  busy: boolean;
  onGotIt: (format: CollectionFormat) => void;
}) {
  const t = useTranslations("collection");
  const [choosing, setChoosing] = useState(false);
  const base =
    "inline-flex shrink-0 items-center rounded-md border px-3 py-1.5 font-data text-xs transition-colors disabled:opacity-50 [@media(pointer:coarse)]:min-h-11";

  if (choosing) {
    return (
      <div role="group" aria-label={t("gotItChooseFormat")} className="flex flex-wrap items-center gap-1.5">
        <span className="font-data text-xs text-paper-muted">{t("gotItChooseFormat")}</span>
        {COLLECTION_FORMATS.map((option) => (
          <button
            key={option}
            type="button"
            disabled={busy}
            onClick={() => {
              setChoosing(false);
              onGotIt(option);
            }}
            className={`${base} border-ink-border text-paper hover:border-amber`}
          >
            {t(`format.${option}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setChoosing(false)}
          className="font-data text-xs text-paper-muted underline decoration-dotted hover:text-paper [@media(pointer:coarse)]:min-h-11"
        >
          {t("cancelEdit")}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-expanded={format === null ? false : undefined}
      onClick={() => (format ? onGotIt(format) : setChoosing(true))}
      className={`${base} border-amber text-amber hover:bg-amber/10`}
    >
      {t("gotIt")}
    </button>
  );
}
