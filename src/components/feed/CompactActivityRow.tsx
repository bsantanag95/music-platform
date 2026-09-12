"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { targetHref } from "./feed-target";
import { RelativeDate } from "./feed-row-parts";
import { FEED_KIND_ICONS } from "./FeedKindIcons";
import { CoverThumb } from "@/components/catalog/CoverThumb";
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
function ClampedSnippet({ body }: { body: string }) {
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
        className={`mt-0.5 font-body text-sm text-paper-muted${collapsed ? " line-clamp-2" : ""}`}
      >
        {body}
      </p>
      {overflowing ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-0.5 font-data text-xs text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
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
        : `★ ${Number(entry.stars)}`;

  // El glifo de refuerzo se omite en rating (★ ya cumple ese rol) — mismo
  // criterio que `FeedActivityList` (openspec: add-feed-kind-differentiation).
  const icon = entry.kind === "comment" || entry.kind === "review" ? FEED_KIND_ICONS[entry.kind] : null;

  const body = entry.kind === "comment" || entry.kind === "review" ? entry.body : null;

  return (
    <li className={`flex gap-3 py-3 first:pt-0 last:pb-0 ${isReview ? "border-l-2 border-petrol pl-2" : ""}`}>
      {/* Decorativa: el título va al lado como texto. */}
      <CoverThumb cover={entry.target.coverThumbUrl} label="" className="size-10" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-data text-xs text-paper-muted">
          <Link
            href={`/users/${encodeURIComponent(username)}`}
            className="transition-colors hover:text-amber"
          >
            {authorLabel}
          </Link>
          {icon ? (
            <span aria-hidden="true" className={`inline-flex ${isReview ? "text-petrol" : ""}`}>
              {icon}
            </span>
          ) : null}
          <span className={isReview ? "text-petrol" : ""}>{typeLabel}</span>
          <RelativeDate iso={entry.createdAt} />
        </div>
        <Link
          href={targetHref(entry.target.type, entry.target.id)}
          className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
        >
          {entry.target.title}
        </Link>
        {body ? <ClampedSnippet body={body} /> : null}
      </div>
    </li>
  );
}
