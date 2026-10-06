"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { targetHref } from "./feed-target";
import { RelativeDate } from "./feed-row-parts";
import { FEED_KIND_ICONS } from "./FeedKindIcons";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import { formatStars } from "@/components/album/album-format";
// Tipos del cliente (inferidos de Zod, `artistName` opcional) en vez de los del
// servicio: esta fila la consumen tanto un Server Component con datos crudos
// del servicio (`CommunityActivity`, más estrictos) como un Client Component
// con datos que pasaron por `apiFetch` (`CommunityActivitySection`) — el tipo
// más permisivo es el que hace que ambos encajen sin duplicar la fila.
import type { FeedComment, FeedRating, FeedReview } from "@/lib/api/schemas";

export type CompactActivityEntry = FeedRating | FeedComment | FeedReview;

const CLAMP_LINES = 2;

// Snippet de comentario/reseña con el mismo comportamiento de plegado que
// `ProsePanel` (feed completo de `/me/feed`) pero a la escala de la fila
// densa: 2 líneas en vez de 6, sin la cita en bloque. Mide el alto real del
// texto para decidir si hace falta el botón — un `line-clamp-2` fijo sin esto
// corta reseñas largas sin dar forma de leerlas completas (feedback
// 2026-09-11).
// `accent`: la reseña marca su tipo con el borde petróleo del snippet (antes
// lo llevaba toda la fila, que desalineaba su carátula respecto del resto).
function ClampedSnippet({ body, accent }: { body: string; accent: "review" | "neutral" }) {
  const t = useTranslations("feed");
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wasExpandedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    if (!Number.isFinite(lineHeight)) return;
    setOverflowing(el.scrollHeight > lineHeight * CLAMP_LINES + 1);
  }, [body]);

  // Mismo criterio que ProsePanel: al colapsar, corrige la posición de scroll
  // antes de pintar para que "Ver menos" no deje la vista mirando el footer.
  useLayoutEffect(() => {
    if (wasExpandedRef.current && !expanded) {
      containerRef.current?.scrollIntoView({ block: "nearest" });
    }
    wasExpandedRef.current = expanded;
  }, [expanded]);

  const collapsed = overflowing && !expanded;

  return (
    <div ref={containerRef}>
      <p
        ref={ref}
        className={`mt-1 border-l-2 pl-2.5 font-body text-sm text-paper-muted ${accent === "review" ? "border-petrol" : "border-ink-border"}${collapsed ? " line-clamp-2" : ""}`}
      >
        {body}
      </p>
      {overflowing ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-0.5 ml-3 font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
        >
          {expanded ? t("showLess") : t("showMore")}
        </button>
      ) : null}
    </div>
  );
}

// Fila compacta de actividad (rating, comentario o reseña): carátula + autor +
// tipo + fecha relativa + snippet. Reusada por el bloque de Inicio
// (`CommunityActivity`, sin paginar) y por la sección "Recientes" de
// `/activity` (paginada) — mismo criterio que `CommunityListCard` en listas.
// Cliente porque `RelativeDate` necesita `useFormatter`/`useNow` (evita
// desajuste de hidratación); sin acciones, es una vitrina de lectura.
export function CompactActivityRow({ entry }: { entry: CompactActivityEntry }) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const username = entry.author.username;
  const authorLabel = entry.author.displayName ?? `@${username}`;
  const isReview = entry.kind === "review";

  const typeLabel =
    entry.kind === "comment"
      ? t("commentLabel")
      : entry.kind === "review"
        ? entry.title
          ? t("reviewVerbTitled", { title: entry.title })
          : t("reviewVerb")
        : // Forma compacta `★ 86/100` con puntaje detallado, `★ 4,5` sin él — nunca
          // ambos (rating-display: el /100 también se muestra en la actividad de la comunidad).
          entry.detailedScore != null
          ? `${entry.detailedScore}/100`
          : formatStars(Number(entry.stars), locale);

  // El glifo de refuerzo se omite en rating (★ ya cumple ese rol) — mismo
  // criterio que `FeedActivityList` (openspec: add-feed-kind-differentiation).
  const icon = entry.kind === "comment" || entry.kind === "review" ? FEED_KIND_ICONS[entry.kind] : null;

  const body = entry.kind === "comment" || entry.kind === "review" ? entry.body : null;

  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      {/* Decorativa: el título va al lado como texto. */}
      <CoverThumb
        cover={entry.target.coverThumbUrl}
        label=""
        className="size-10 shadow-sm shadow-black/40 ring-1 ring-ink-border"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 font-data text-xs text-paper-muted">
          <span className="flex min-w-0 items-baseline gap-x-1.5">
            <UserHoverCard username={username}>
              <Link
                href={`/users/${encodeURIComponent(username)}`}
                className="truncate text-paper transition-colors hover:text-amber"
              >
                {authorLabel}
              </Link>
            </UserHoverCard>
            <span aria-hidden="true">·</span>
            {entry.kind === "rating" ? (
              <span className="shrink-0">
                <span aria-hidden="true" className="text-amber">
                  ★
                </span>{" "}
                <span className="font-medium text-paper">{typeLabel}</span>
              </span>
            ) : (
              <span className={`inline-flex min-w-0 items-baseline gap-1 ${isReview ? "text-petrol" : ""}`}>
                {icon ? (
                  <span aria-hidden="true" className="inline-flex translate-y-px self-center">
                    {icon}
                  </span>
                ) : null}
                <span className="truncate">{typeLabel}</span>
              </span>
            )}
          </span>
          <RelativeDate iso={entry.createdAt} />
        </div>
        <p className="mt-0.5 truncate">
          <Link
            href={targetHref(
              entry.target.type,
              entry.target.id,
              entry.target.title,
              entry.target.artistName ?? null,
            )}
            className="font-display text-sm text-paper transition-colors hover:text-amber"
          >
            {entry.target.title}
          </Link>
          {entry.target.artistName ? (
            <span className="font-data text-xs text-paper-muted"> · {entry.target.artistName}</span>
          ) : null}
        </p>
        {body ? <ClampedSnippet body={body} accent={isReview ? "review" : "neutral"} /> : null}
      </div>
    </li>
  );
}
