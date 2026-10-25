"use client";

import { useTranslations } from "next-intl";
import { COLLECTION_FORMATS, type CollectionFormat } from "@/services/collection/vocabulary";
import type { CollectionCounts } from "@/lib/api/schemas";

// Retrato de la colección por formato que también filtra (openspec: redesign-collection-header-toolbar, D3): "Todo" y
// los cuatro formatos con su cifra. Las cifras vienen de `counts`, que ignora el filtro de formato, así que elegir uno
// no cambia las de los demás. Un formato sin copias queda deshabilitado (salvo que sea el elegido, para poder salir).
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
    ...COLLECTION_FORMATS.map((format) => ({ key: format, label: t(`format.${format}`), count: counts[format] })),
  ];

  return (
    <div role="radiogroup" aria-label={t("filterFormatLabel")} className="flex gap-2 overflow-x-auto pb-1">
      {options.map((option) => {
        const selected = option.key === value;
        const disabled = option.count === 0 && !selected && option.key !== "";
        return (
          <button
            key={option.key || "all"}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${option.label} ${option.count}`}
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={`inline-flex shrink-0 items-baseline gap-2 rounded-lg border px-3.5 py-2 transition-colors disabled:cursor-default disabled:opacity-40 [@media(pointer:coarse)]:min-h-11 ${
              selected
                ? "border-amber bg-amber/10 text-amber"
                : "border-ink-border text-paper hover:border-paper-muted/40"
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
