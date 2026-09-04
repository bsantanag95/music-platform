"use client";

import { useFormatter, useLocale, useNow } from "next-intl";
import { Link } from "@/i18n/navigation";

// Piezas de presentación compartidas entre `FeedActivityList` y `DiaryActivityList`:
// genéricas por props simples (no por el tipo `FeedEntry`) para que el diario propio
// —que no tiene `kind` ni `author`— también pueda usarlas. Ver
// openspec/changes/redesign-diary, design.md decisión 3.

// Título del objetivo — el ancla tipográfica de la fila (Space Grotesk, un tamaño
// consistente). `stacked` pone el artista debajo en su propia línea; `inline` lo
// comparte con el título para un ritmo más apretado (rastro propio, diario propio).
export function TargetTitle({
  href,
  label,
  artist,
  layout = "stacked",
}: {
  href: string;
  label: string;
  artist: string | null;
  layout?: "stacked" | "inline";
}) {
  const link = (
    <Link
      href={href}
      className="font-display text-base text-paper underline decoration-ink-border decoration-1 underline-offset-4 transition-colors hover:text-amber hover:decoration-amber"
    >
      {label}
    </Link>
  );

  if (layout === "inline") {
    return (
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        {link}
        {artist ? <span className="font-data text-xs text-paper-muted">· {artist}</span> : null}
      </span>
    );
  }

  return (
    <div className="mt-1">
      {link}
      {artist ? <p className="font-data text-xs text-paper-muted">{artist}</p> : null}
    </div>
  );
}

// La prosa de una entrada pesada sobre un panel iluminado — un escalón de temperatura
// sobre el fondo, sin sombra (regla No-Shadow). Es lo que hace que un comentario o una
// impresión escrita "frene" la vista.
export function ProsePanel({ body }: { body: string }) {
  return (
    <p className="mt-2 max-w-[60ch] whitespace-pre-wrap rounded-md border border-ink-border bg-ink-surface px-3 py-2 font-body text-sm text-paper">
      {body}
    </p>
  );
}

export function RelativeDate({ iso }: { iso: string }) {
  const format = useFormatter();
  const locale = useLocale();
  // `now` explícito: sin él, next-intl cae a `new Date()` en cada render y emite
  // `ENVIRONMENT_FALLBACK`, además de arriesgar desajuste de hidratación.
  const now = useNow();
  return (
    <time
      dateTime={iso}
      title={new Date(iso).toLocaleString(locale)}
      className="shrink-0 font-data text-xs text-paper-muted"
    >
      {format.relativeTime(new Date(iso), now)}
    </time>
  );
}
