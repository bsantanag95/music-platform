"use client";

import { useFormatter, useLocale, useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ReactionBadge } from "@/components/diary/ReactionBadge";
import { targetHref } from "./feed-target";
import { FeedRatingMeter } from "./FeedRatingMeter";
import { isFeedEntryWithText } from "./feed-entry-weight";
import { groupAmbientRuns, type FeedEntryGroup } from "./feed-grouping";
import type { FeedEntry } from "@/lib/api/schemas";

type FeedT = (key: string, values?: Record<string, string | number>) => string;

interface FeedActivityListProps {
  entries: FeedEntry[];
  // "feed": actividad ajena — cada fila abre con la celda de carátula/disco y
  // ancla en el autor. "self": tu propio rastro — sin celda ni autor, con un
  // riel izquierdo continuo. Ver openspec/changes/redesign-feed, decisiones 3 y 10.
  variant?: "feed" | "self";
}

// Presentación del feed por peso de contenido: las entradas con prosa
// (comentario, escucha con nota) asientan el texto sobre un panel iluminado;
// el resto —favoritos, listas, ratings, escuchas sin nota— ocupan una fila de
// baseline. Superficie de solo lectura: los únicos controles son enlaces de
// navegación al autor y al objetivo.
export function FeedActivityList({ entries, variant = "feed" }: FeedActivityListProps) {
  const t = useTranslations("feed");
  const self = variant === "self";

  return (
    <ul
      className={
        self
          ? "divide-y divide-ink-border border-l border-ink-border"
          : "divide-y divide-ink-border"
      }
    >
      {groupAmbientRuns(entries).map((row) => {
        if (row.kind === "group") {
          return (
            <li
              key={row.id}
              // Indentada a la columna del título de las filas normales
              // (celda `size-11 sm:size-12` + `gap-3 sm:gap-4`) para que la
              // actividad ambiente se lea subordinada.
              className={`${self ? "py-2 pl-4" : "py-3 pl-14 sm:pl-16"} first:pt-0 last:pb-0`}
            >
              <GroupRow group={row} t={t} hideAuthor={self} />
            </li>
          );
        }

        const heavy = isFeedEntryWithText(row);
        const body = proseBody(row);

        if (self) {
          // Ritmo más apretado que "Tu feed": título, artista y reacción
          // comparten una línea (sin celda ni autor que ya la separan) para
          // que una entrada de sola presencia quede en dos líneas, no cuatro.
          return (
            <li
              key={`${row.kind}-${row.id}`}
              className={`${heavy ? "py-3" : "py-2"} first:pt-0 last:pb-0 pl-4`}
            >
              <MetaLine entry={row} t={t} hideAuthor />
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <TargetTitle {...targetLink(row)} layout="inline" />
                <EntryReaction entry={row} inline />
              </div>
              {row.kind === "rating" ? (
                <FeedRatingMeter
                  stars={row.stars}
                  detailedScore={row.detailedScore}
                  label={ratingMeterLabel(row.stars, row.detailedScore, t)}
                />
              ) : null}
              {heavy && body ? <ProsePanel body={body} /> : null}
            </li>
          );
        }

        return (
          <li key={`${row.kind}-${row.id}`} className={`${heavy ? "py-4" : "py-3"} first:pt-0 last:pb-0`}>
            <div className="flex gap-3 sm:gap-4">
              <FeedCell entry={row} />
              <div className="min-w-0 flex-1">
                <MetaLine entry={row} t={t} hideAuthor={false} />
                <TargetTitle {...targetLink(row)} />
                <EntryReaction entry={row} />
                {row.kind === "rating" ? (
                  <FeedRatingMeter
                    stars={row.stars}
                    detailedScore={row.detailedScore}
                    label={ratingMeterLabel(row.stars, row.detailedScore, t)}
                  />
                ) : null}
                {heavy && body ? <ProsePanel body={body} /> : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Corrida de sola presencia (3+ escuchas o favoritos consecutivos de un autor)
// plegada en una fila: la actividad ambiente se lee como ambiente, no
// itemizada. Fila subordinada — indentada a la columna del título, sin celda.
function GroupRow({
  group,
  t,
  hideAuthor,
}: {
  group: FeedEntryGroup;
  t: FeedT;
  hideAuthor: boolean;
}) {
  const shown = group.entries.slice(0, 4);
  const more = group.entries.length - shown.length;
  const verb =
    group.groupedKind === "listen"
      ? t("groupListens", { count: group.entries.length })
      : t("groupFavorites", { count: group.entries.length });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-data text-xs text-paper-muted">
          {hideAuthor ? null : (
            <>
              <AuthorLink author={group.author} />
              {" · "}
            </>
          )}
          {verb}
        </span>
        <RelativeDate iso={group.createdAt} />
      </div>
      <p className="mt-1 font-data text-xs text-paper-muted">
        {shown.map((entry, index) => {
          const { href, label } = targetLink(entry);
          return (
            <span key={entry.id}>
              {index > 0 ? ", " : ""}
              <Link href={href} className="text-paper transition-colors hover:text-amber">
                {label}
              </Link>
            </span>
          );
        })}
        {more > 0 ? (
          <>
            {" "}
            <Link
              href={`/users/${encodeURIComponent(group.author.username)}`}
              className="transition-colors hover:text-amber"
            >
              {t("groupMore", { count: more })}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

function actionLabel(entry: FeedEntry, t: FeedT): string {
  switch (entry.kind) {
    case "listen":
      return t(`context.${entry.listenContext}`);
    case "favorite":
      return t("favoriteLabel");
    case "rating":
      return t("ratingVerb");
    case "comment":
      return t("commentLabel");
    case "list":
      return t(`list.${entry.event}`);
  }
}

function ratingMeterLabel(stars: string, score: number | null, t: FeedT): string {
  return score != null
    ? t("ratingMeterLabelScore", { stars, score })
    : t("ratingMeterLabel", { stars });
}

function audienceLabel(entry: FeedEntry, t: FeedT): string | null {
  return entry.kind === "listen" || entry.kind === "favorite" || entry.kind === "list"
    ? t(`audience.${entry.audience}`)
    : null;
}

function proseBody(entry: FeedEntry): string | null {
  if (entry.kind === "comment") return entry.body;
  if (entry.kind === "listen") return entry.body;
  return null;
}

function targetLink(entry: FeedEntry): { href: string; label: string; artist: string | null } {
  if (entry.kind === "list") {
    return {
      href: `/users/${encodeURIComponent(entry.author.username)}/lists/${entry.list.id}`,
      label: entry.list.title,
      artist: null,
    };
  }
  const type = entry.kind === "favorite" ? entry.targetType : entry.target.type;
  return {
    href: targetHref(type, entry.target.id),
    label: entry.target.title,
    artist: entry.target.artistName ?? null,
  };
}

function coverForEntry(entry: FeedEntry): string | null {
  if (entry.kind === "list") return null;
  const type = entry.kind === "favorite" ? entry.targetType : entry.target.type;
  return type === "release-group" ? entry.target.coverThumbUrl : null;
}

// Celda izquierda fija: carátula del objetivo o disco de vinilo. Columna
// rígida — la ausencia de arte no deja hueco. Decorativa: el título va al lado.
function FeedCell({ entry }: { entry: FeedEntry }) {
  return <CoverThumb cover={coverForEntry(entry)} label="" className="size-11 sm:size-12" />;
}

// Título del objetivo — el ancla tipográfica de la fila (Space Grotesk, un
// tamaño consistente). En "Tu feed" el artista va debajo, en su propia línea;
// en "Tu rastro reciente" (`inline`) comparte línea con el título para
// mantener el ritmo apretado del riel propio.
function TargetTitle({
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

// Línea de metadato: [autor ·] verbo · audiencia, con la fecha relativa a la
// derecha. IBM Plex Mono `text-xs` muted, secundaria al título. En el rastro
// propio se omite el autor.
function MetaLine({
  entry,
  t,
  hideAuthor,
}: {
  entry: FeedEntry;
  t: FeedT;
  hideAuthor: boolean;
}) {
  const audience = audienceLabel(entry, t);
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 font-data text-xs text-paper-muted">
        {hideAuthor ? null : (
          <>
            <AuthorLink author={entry.author} />
            {" · "}
          </>
        )}
        {actionLabel(entry, t)}
        {audience ? ` · ${audience}` : null}
      </span>
      <RelativeDate iso={entry.createdAt} />
    </div>
  );
}

function AuthorLink({ author }: { author: FeedEntry["author"] }) {
  return (
    <Link
      href={`/users/${encodeURIComponent(author.username)}`}
      className="text-paper transition-colors hover:text-amber"
    >
      {author.displayName ?? `@${author.username}`}
    </Link>
  );
}

function EntryReaction({ entry, inline = false }: { entry: FeedEntry; inline?: boolean }) {
  if (entry.kind !== "listen" || !entry.reaction) return null;
  return (
    <span className={inline ? "shrink-0 font-data text-xs" : "mt-1 inline-block font-data text-xs"}>
      <ReactionBadge reaction={entry.reaction} />
    </span>
  );
}

// La prosa de una entrada pesada sobre un panel iluminado — un escalón de
// temperatura sobre el fondo, sin sombra (regla No-Shadow). Es lo que hace
// que un comentario "frene" la vista.
function ProsePanel({ body }: { body: string }) {
  return (
    <p className="mt-2 max-w-[60ch] whitespace-pre-wrap rounded-md border border-ink-border bg-ink-surface px-3 py-2 font-body text-sm text-paper">
      {body}
    </p>
  );
}

function RelativeDate({ iso }: { iso: string }) {
  const format = useFormatter();
  const locale = useLocale();
  // `now` explícito: sin él, next-intl cae a `new Date()` en cada render y
  // emite `ENVIRONMENT_FALLBACK`, además de arriesgar desajuste de hidratación.
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
