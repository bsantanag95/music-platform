"use client";

import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

// La prosa de una entrada pesada, tratada como cita — no como panel de UI: la
// misma familia visual que `ImpressionQuote` de `/me/diary` (borde izquierdo,
// sin caja ni escalón de temperatura), para que "frene" la vista por ser
// texto, no por parecer otro control más entre filas de varios autores.
// Dos variantes por *tono*, no por caja — la caja es la misma para ambas:
// - "impression" (nota de escucha, `kind: "listen"`): literalmente el mismo
//   campo que `ImpressionQuote` de diario, solo visto desde el feed — cursiva
//   y entre comillas, la misma voz personal.
// - "comment" (comentario, `kind: "comment"`): en redonda y sin comillas. Un
//   comentario en el feed suele ser crítica o humor, no necesariamente una
//   impresión sentida; forzarlo a leerse como una cita personal no encajaba
//   con ese tono (ver feedback del 2026-09-05 sobre add-feed-filters).
//
// `clamp`: solo el feed lo pasa en `true` (`FeedActivityList`) — el diario
// propio (`DiaryActivityList`) nunca lo activa, así que ahí el texto sigue
// mostrándose completo como siempre. Un comentario llega a tener hasta 5000
// caracteres (`CommentRequestSchema`) y el feed mezcla entradas de varias
// personas en un solo scroll — sin tope, una reseña larga empuja todo lo
// demás fuera de pantalla; 6 líneas (`line-clamp-6` abajo — literal a
// propósito, Tailwind no genera la utilidad si el nombre de clase se arma por
// interpolación) alcanza para juzgar si vale la pena seguir leyendo sin que
// la fila deje de ser una fila.
//
// La detección de desborde mide la altura NATURAL del párrafo (sin recortar
// todavía) contra `lineHeight × 6`, no por cantidad de caracteres — un texto
// corto con varios saltos de línea explícitos puede ocupar tantas líneas como
// uno largo sin ninguno. Importante: NO compara `scrollHeight` contra
// `clientHeight` de un elemento que ya tiene `-webkit-line-clamp` aplicado —
// ese layout (`display: -webkit-box`) hace que ambos valores coincidan en
// varios navegadores aunque el contenido esté recortado, dando falsos
// negativos/positivos. Por eso el recorte solo se activa DESPUÉS de confirmar
// que hace falta (`collapsed` depende de `overflowing`, no al revés).
export function ProsePanel({
  body,
  variant,
  clamp = false,
}: {
  body: string;
  variant: "impression" | "comment";
  clamp?: boolean;
}) {
  const t = useTranslations("feed");
  const impression = variant === "impression";
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasExpandedRef = useRef(false);

  useEffect(() => {
    if (!clamp) return;
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    if (!Number.isFinite(lineHeight)) return;
    setOverflowing(el.scrollHeight > lineHeight * 6 + 1);
  }, [clamp, body]);

  // Al colapsar, el contenido se encoge pero el scroll del viewport queda
  // donde estaba — sin esto, "Ver menos" puede dejar al usuario mirando
  // contenido que quedó mucho más abajo (a veces el footer, ver feedback del
  // 2026-09-05). Se corrige ANTES de pintar (`useLayoutEffect`, no
  // `useEffect`) para que la corrección no se vea como un segundo salto. Sin
  // animación (`block: "nearest"`, sin `behavior: "smooth"`): es una
  // corrección de posición, no un gesto de scroll — sigue la regla de "sin
  // movimiento decorativo".
  useLayoutEffect(() => {
    if (wasExpandedRef.current && !expanded) {
      containerRef.current?.scrollIntoView({ block: "nearest" });
    }
    wasExpandedRef.current = expanded;
  }, [expanded]);

  const collapsed = clamp && overflowing && !expanded;

  return (
    <div ref={containerRef} className="mt-2 max-w-[60ch]">
      <p
        ref={ref}
        className={`whitespace-pre-wrap border-l-2 border-ink-border pl-3 font-body text-sm text-paper${
          impression ? " italic" : ""
        }${collapsed ? " line-clamp-6" : ""}`}
      >
        {impression ? <>“{body}”</> : body}
      </p>
      {clamp && overflowing && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-1 ml-3 font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      )}
    </div>
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
