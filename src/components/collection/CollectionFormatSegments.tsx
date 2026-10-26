"use client";

import { useTranslations } from "next-intl";
import { COLLECTION_FORMATS, type CollectionFormat } from "@/services/collection/vocabulary";
import type { CollectionCounts } from "@/lib/api/schemas";

// Retrato de la colección por formato que también filtra (openspec: redesign-collection-header-toolbar, D3): "Todo" y
// los cuatro formatos con su cifra. Las cifras vienen de `counts`, que ignora el filtro de formato, así que elegir uno
// no cambia las de los demás. Un formato sin copias no se muestra (salvo que sea el elegido, para poder salir). El
// elegido usa un estado neutro: el ámbar queda para la pestaña activa.
export function CollectionFormatSegments({
  counts,
  value,
  onChange,
}: {
  counts: CollectionCounts;
  value: CollectionFormat | "";
  onChange: (next: CollectionFormat | "") => void;
}) {
  const t = useTranslations("collection");
  const all = COLLECTION_FORMATS.reduce((sum, format) => sum + counts[format], 0);
  const options: { key: CollectionFormat | ""; label: string; count: number }[] = [
    { key: "", label: t("allFormatsShort"), count: all },
    ...COLLECTION_FORMATS.filter((format) => counts[format] > 0 || format === value).map((format) => ({
      key: format,
      label: t(`format.${format}`),
      count: counts[format],
    })),
  ];

  return (
    <div role="radiogroup" aria-label={t("filterFormatLabel")} className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key || "all"}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${option.label} ${option.count}`}
            onClick={() => onChange(option.key)}
            className={`inline-flex shrink-0 items-baseline gap-2 rounded-lg border px-3.5 py-2 transition-colors [@media(pointer:coarse)]:min-h-11 ${
              selected
                ? "border-paper-muted/60 bg-ink-surface text-paper"
                : "border-ink-border text-paper-muted hover:border-paper-muted/40 hover:text-paper"
            }`}
          >
            <span className="font-display text-lg leading-none tabular-nums">{option.count}</span>
            <span className="font-data text-xs">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
