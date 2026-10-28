"use client";

import { useTranslations } from "next-intl";
import type { FeedKind } from "@/lib/api/schemas";

// Chips de filtro por tipo: forma de chip (no subrayado) para que se lean como filtro y no como otra fila de pestañas.
// Una sola fila; en móvil se desplaza en horizontal sin desbordar la página. Compartidos por `/activity` y `/me/feed`
// (redesign-feed-people, D6).
export function FeedKindChips({
  kinds,
  active,
  onChange,
}: {
  kinds: readonly FeedKind[];
  active: FeedKind | undefined;
  onChange: (kind: FeedKind | undefined) => void;
}) {
  const t = useTranslations("feed");
  const options: { kind: FeedKind | undefined; label: string }[] = [
    { kind: undefined, label: t("community.chips.all") },
    ...kinds.map((kind) => ({ kind, label: t(`community.chips.${kind}`) })),
  ];
  return (
    <div
      role="group"
      aria-label={t("community.filterLabel")}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {options.map((option) => {
        const selected = option.kind === active;
        return (
          <button
            key={option.kind ?? "all"}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.kind)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1 font-data text-xs transition-colors [@media(pointer:coarse)]:min-h-11 ${
              selected
                ? "border-amber/60 bg-amber/10 text-amber"
                : "border-ink-border text-paper-muted hover:border-paper-muted hover:text-paper"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
