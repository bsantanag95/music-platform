"use client";

import { AppImage } from "@/components/ui/AppImage";
import { useLocale, useNow, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ReactionBadge } from "@/components/diary/ReactionBadge";
import { formatStars } from "@/components/album/album-format";
import { targetHref } from "./feed-target";
import { listHref } from "@/lib/catalog-links";
import { StarRatingValue } from "@/components/social/StarRatingValue";
import { CommentTopicLabel } from "@/components/social/CommentTopicLabel";
import { isFeedEntryQuote } from "./feed-entry-tier";
import {
  groupFeedRuns,
  type FeedEntryGroup,
  type FeedOpinionRow,
  type FeedRotationPeak,
} from "./feed-grouping";
import { ProsePanel, RelativeDate, TargetTitle } from "./feed-row-parts";
import { FEED_KIND_ICONS } from "./FeedKindIcons";
import { UserHoverCard } from "@/components/profiles/UserHoverCard";
import type { FeedComment, FeedEntry } from "@/lib/api/schemas";

type FeedT = (key: string, values?: Record<string, string | number>) => string;

interface FeedActivityListProps {
  entries: FeedEntry[];
  // "feed": actividad ajena — cada fila abre con la celda de carátula/disco y
  // ancla en el autor. "self": tu propio rastro — sin celda ni autor, con un
  // riel izquierdo continuo. Ver openspec/changes/redesign-feed, decisiones 3 y 10.
  variant?: "feed" | "self";
  // Pliega una cita larga (comentario o nota de escucha) que supera 6 líneas
  // de alto real, con un botón "Ver más"/"Ver menos". Opt-in: `FeedList`
  // (`/me/feed`) lo activa; `ScrollablePreviewList` (preview de feed y rastro
  // reciente de Inicio) NO lo pasa a propósito — ese preview ya está acotado
  // por su propio contenedor de scroll, plegar ahí encima sería doble tope
  // (ver openspec/changes/add-feed-filters, Non-Goals).
  clamp?: boolean;
}

// Presentación del feed por peso de contenido: las entradas con prosa
// (comentario, escucha con nota) asientan el texto sobre un panel iluminado;
// el resto —favoritos, listas, ratings, escuchas sin nota— ocupan una fila de
// baseline. Superficie de solo lectura: los únicos controles son enlaces de
// navegación al autor y al objetivo.
export function FeedActivityList({ entries, variant = "feed", clamp = false }: FeedActivityListProps) {
  const t = useTranslations("feed");
  const locale = useLocale();
  const self = variant === "self";
  // `now` estable dentro del request (mismo valor que las fechas relativas):
  // `groupFeedRuns` lo usa para la ventana de 7 días del pico de rotación.
  const now = useNow();

  return (
    <ul
      className={
        self
          ? // `ml-[5px]`: deja sitio a los hitos del riel, que asoman fuera del borde y
            // si no los recortaría el contenedor con scroll de Inicio.
            "ml-[5px] divide-y divide-ink-border border-l border-ink-border"
          : "divide-y divide-ink-border"
      }
    >
      {groupFeedRuns(entries, now).map((row) => {
        // Fila subordinada, indentada a la columna del título de las filas
        // normales (celda `size-11 sm:size-12` + `gap-3 sm:gap-4`), sin celda:
        // tanto el grupo colapsado como el pico de rotación se leen como
        // contexto, no como evento destacado.
        const subordinateClass = `${self ? "relative py-2 pl-4" : "py-3 pl-14 sm:pl-16"} first:pt-0 last:pb-0`;
        const subordinateDot = self ? <TimelineDot top="top-3" /> : null;

        if (row.kind === "rotation-peak") {
          return (
            <li key={row.id} className={subordinateClass}>
              {subordinateDot}
              <RotationPeakRow peak={row} t={t} hideAuthor={self} />
            </li>
          );
        }

        if (row.kind === "group") {
          return (
            <li key={row.id} className={subordinateClass}>
              {subordinateDot}
              <GroupRow group={row} t={t} hideAuthor={self} />
            </li>
          );
        }

        if (row.kind === "opinion") {
          return (
            <li key={row.id} className={`${self ? "relative py-3 pl-4" : "py-4"} first:pt-0 last:pb-0`}>
              {self ? <TimelineDot filled top="top-4" /> : null}
              <OpinionRow row={row} t={t} self={self} clamp={clamp} />
            </li>
          );
        }

        if (row.kind === "follow") {
          return (
            <li key={`follow-${row.id}`} className={subordinateClass}>
              {subordinateDot}
              <FollowRow entry={row} t={t} hideAuthor={self} />
            </li>
          );
        }

        if (row.kind === "follow-artist") {
          return (
            <li key={`follow-artist-${row.id}`} className={subordinateClass}>
              {subordinateDot}
              <FollowArtistRow entry={row} t={t} hideAuthor={self} />
            </li>
          );
        }

        const heavy = isFeedEntryQuote(row);
        const body = proseBody(row);

        if (self) {
          // Ritmo más apretado que "Tu feed": título, artista y reacción
          // comparten una línea (sin celda ni autor que ya la separan) para
          // que una entrada de sola presencia quede en dos líneas, no cuatro.
          return (
            <li
              key={entryKey(row)}
              className={`relative ${heavy ? "py-3" : "py-2.5"} first:pt-0 last:pb-0 pl-4`}
            >
              <TimelineDot filled={heavy} top={heavy ? "top-4" : "top-[0.875rem]"} />
              <MetaLine entry={row} t={t} hideAuthor />
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <TargetTitle {...targetLink(row)} layout="inline" />
                <EntryReaction entry={row} inline />
                {/* La nota comparte la línea del título: en el rastro propio la
                    entrada de valoración queda en dos líneas, no tres. */}
                {row.kind === "rating" ? (
                  <span className="shrink-0 [&>span]:mt-0">
                    <RatingValue entry={row} t={t} locale={locale} />
                  </span>
                ) : null}
              </div>
              {row.kind === "review" ? <ReviewKicker title={row.title} /> : null}
              {heavy && body ? (
                <ProsePanel
                  body={body}
                  variant={row.kind === "listen" ? "impression" : "comment"}
                  clamp={clamp}
                  accent={row.kind === "review" ? "review" : undefined}
                />
              ) : null}
            </li>
          );
        }

        return (
          <li key={entryKey(row)} className={`${heavy ? "py-4" : "py-3"} first:pt-0 last:pb-0`}>
            <div className="flex gap-3 sm:gap-4">
              <FeedCell entry={row} />
              <div className="min-w-0 flex-1">
                <MetaLine entry={row} t={t} hideAuthor={false} />
                <TargetTitle {...targetLink(row)} />
                <EntryReaction entry={row} />
                {row.kind === "rating" ? <RatingValue entry={row} t={t} locale={locale} /> : null}
                {row.kind === "review" ? <ReviewKicker title={row.title} /> : null}
                {heavy && body ? (
                  <ProsePanel
                    body={body}
                    variant={row.kind === "listen" ? "impression" : "comment"}
                    clamp={clamp}
                    accent={row.kind === "review" ? "review" : undefined}
                  />
                ) : null}
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
  const locale = useLocale();
  const shown = group.entries.slice(0, 4);
  const more = group.entries.length - shown.length;
  const verb =
    group.groupedKind === "listen"
      ? t("groupListens", { count: group.entries.length })
      : group.groupedKind === "favorite"
        ? t("groupFavorites", { count: group.entries.length })
        : group.groupedKind === "follow"
          ? t("groupFollows", { count: group.entries.length })
          : group.groupedKind === "follow-artist"
            ? t("groupFollowArtists", { count: group.entries.length })
            : group.groupedKind === "collection"
              ? t("groupCollection", { count: group.entries.length })
              : group.groupedKind === "wanted"
                ? t("groupWanted", { count: group.entries.length })
                : t(group.tier === 2 ? "groupRatings" : "groupSongRatings", { count: group.entries.length });

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-data text-xs text-paper-muted">
          {hideAuthor ? null : (
            <>
              <AuthorIdentity author={group.author} />
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
              {entry.kind === "rating" ? (
                <span className="text-amber"> (★ {ratingGroupValue(entry, locale)})</span>
              ) : null}
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

// Pico de rotación (openspec: add-feed-rotation-peak): una corrida de escuchas
// del mismo objetivo en 7 días se sintetiza como "En rotación", no como una
// lista de títulos repetidos. Misma anatomía subordinada que `GroupRow` —
// línea de metadato + el objetivo enlazado debajo. Tono cultural: la única
// métrica es la cuenta de la semana, sin racha, sin fuego, sin exclamaciones.
function RotationPeakRow({
  peak,
  t,
  hideAuthor,
}: {
  peak: FeedRotationPeak;
  t: FeedT;
  hideAuthor: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 font-data text-xs text-paper-muted">
          {hideAuthor ? null : (
            <>
              <AuthorIdentity author={peak.author} />
              {" · "}
            </>
          )}
          {t("rotationPeak", { count: peak.count })}
        </span>
        <RelativeDate iso={peak.createdAt} />
      </div>
      <p className="mt-1 font-data text-xs text-paper-muted">
        <Link
          href={targetHref(
            peak.target.type,
            peak.target.id,
            peak.target.title,
            peak.target.artistName ?? null,
          )}
          className="text-paper transition-colors hover:text-amber"
        >
          {peak.target.title}
        </Link>
        {peak.target.artistName ? ` · ${peak.target.artistName}` : null}
      </p>
    </div>
  );
}

// Tier 4 activo (openspec: add-feed-kind-differentiation): la fila más
// callada del sistema — sin celda, sin objetivo de catálogo, una sola línea.
// Misma anatomía subordinada que `GroupRow`/`RotationPeakRow`, pero sin la
// segunda línea de objetivo (el "objetivo" es la persona seguida, ya enlazada
// en la propia línea de metadato).
function FollowRow({
  entry,
  t,
  hideAuthor,
}: {
  entry: Extract<FeedEntry, { kind: "follow" }>;
  t: FeedT;
  hideAuthor: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 font-data text-xs text-paper-muted">
        <span aria-hidden="true" className="mr-1 inline-flex translate-y-px align-middle">
          {FEED_KIND_ICONS.follow}
        </span>
        {hideAuthor ? null : (
          <>
            <AuthorIdentity author={entry.author} />
            {" "}
          </>
        )}
        {t("followVerb")}{" "}
        <UserHoverCard username={entry.followedUser.username}>
          <Link
            href={`/users/${encodeURIComponent(entry.followedUser.username)}`}
            className="text-paper transition-colors hover:text-amber"
          >
            {entry.followedUser.displayName ?? `@${entry.followedUser.username}`}
          </Link>
        </UserHoverCard>
      </span>
      <RelativeDate iso={entry.createdAt} />
    </div>
  );
}

// Tier 4 activo (openspec: add-artist-follow-feed-entry), misma anatomía que
// `FollowRow` — la única diferencia es el objetivo (artista, no persona) y que
// no hay noción de perfil privado sobre el objetivo.
function FollowArtistRow({
  entry,
  t,
  hideAuthor,
}: {
  entry: Extract<FeedEntry, { kind: "follow-artist" }>;
  t: FeedT;
  hideAuthor: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 font-data text-xs text-paper-muted">
        <span aria-hidden="true" className="mr-1 inline-flex translate-y-px align-middle">
          {FEED_KIND_ICONS["follow-artist"]}
        </span>
        {hideAuthor ? null : (
          <>
            <AuthorIdentity author={entry.author} />
            {" "}
          </>
        )}
        {t("followArtistVerb")}{" "}
        <Link href={targetHref("artist", entry.artist.id, entry.artist.name)} className="text-paper transition-colors hover:text-amber">
          {entry.artist.name}
        </Link>
      </span>
      <RelativeDate iso={entry.createdAt} />
    </div>
  );
}

// Titular propio de la reseña, cuando existe. El rótulo "Reseña" que iba acá
// arriba se retiró: la línea de metadato ya dice "Reseñó" con su ícono y el
// borde petróleo de la prosa marca el tipo — eran tres señales para lo mismo.
function ReviewKicker({ title }: { title: string | null }) {
  return title ? <p className="mt-1.5 font-display text-sm text-paper">{title}</p> : null;
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
    case "review":
      // El título ya no va acá: pasa a ser su propio titular (ver `ReviewKicker`).
      return t("reviewVerb");
    case "list":
      return t(`list.${entry.event}`);
    case "follow":
      return t("followVerb");
    case "follow-artist":
      return t("followArtistVerb");
    case "collection":
      return `${t("collectionLabel")} · ${t(`format.${entry.format}`)}`;
    case "wanted":
      return `${t("wantedLabel")} · ${entry.format ? t(`format.${entry.format}`) : t("anyFormat")}`;
    case "camino":
      return entry.camino.albumCount > 0
        ? `${t(`camino.${entry.event}`)} · ${t("caminoAlbums", { count: entry.camino.albumCount })}`
        : t(`camino.${entry.event}`);
  }
}

// Key de React por entrada: un Camino puede aparecer dos veces en la misma
// página (creado y completado) con el mismo id.
function entryKey(entry: FeedEntry): string {
  return entry.kind === "camino" ? `camino-${entry.event}-${entry.id}` : `${entry.kind}-${entry.id}`;
}

// El feed muestra el puntaje detallado cuando el autor lo puso (openspec:
// expand-feed-coverage, revierte D7 de define-detailed-score solo para el feed):
// `86/100` en lugar de `4,5`, y la etiqueta accesible lo incluye.
function ratingLabel(stars: string, detailedScore: number | null, t: FeedT, locale: string): string {
  const formatted = formatStars(Number(stars), locale);
  return detailedScore != null
    ? t("ratingLabelScore", { stars: formatted, score: detailedScore })
    : t("ratingLabel", { stars: formatted });
}

// Hito sobre el riel izquierdo del rastro propio, alineado con la línea de
// metadato: convierte el borde continuo en una línea de tiempo legible. Las
// entradas con prosa (reseña, comentario, nota) llevan el hito relleno.
// `top` = padding superior de la fila + medio renglón de metadato − medio hito.
function TimelineDot({ filled = false, top }: { filled?: boolean; top: string }) {
  return (
    <span
      aria-hidden="true"
      data-timeline-dot=""
      className={`absolute -left-[4.5px] ${top} size-2 rounded-full ring-4 ring-ink [li:first-child>&]:top-1 ${
        filled ? "bg-paper" : "bg-paper-muted/60"
      }`}
    />
  );
}

function RatingValue({
  entry,
  t,
  locale,
}: {
  entry: Extract<FeedEntry, { kind: "rating" }>;
  t: FeedT;
  locale: string;
}) {
  return (
    <StarRatingValue
      stars={entry.stars}
      detailedScore={entry.detailedScore}
      showScore
      label={ratingLabel(entry.stars, entry.detailedScore, t, locale)}
    />
  );
}

// Valor compacto para una valoración dentro de una fila de grupo plegada — sin repetir la fila
// de estrellas completa por cada entrada de la corrida. Se muestra tras la estrella de la forma
// compacta (rating-display): `★ 86/100` con puntaje detallado, `★ 4,5` sin él; nunca un número
// suelto ni ambos.
function ratingGroupValue(entry: Extract<FeedEntry, { kind: "rating" }>, locale: string): string {
  return entry.detailedScore != null ? `${entry.detailedScore}/100` : formatStars(Number(entry.stars), locale);
}

function audienceLabel(entry: FeedEntry, t: FeedT): string | null {
  return entry.kind === "listen" ||
    entry.kind === "favorite" ||
    entry.kind === "list" ||
    entry.kind === "collection" ||
    entry.kind === "wanted" ||
    entry.kind === "camino"
    ? t(`audience.${entry.audience}`)
    : null;
}

function proseBody(entry: FeedEntry): string | null {
  if (entry.kind === "comment") return entry.body;
  if (entry.kind === "review") return entry.body;
  if (entry.kind === "listen") return entry.body;
  return null;
}

function targetLink(
  entry: FeedEntry,
): { href: string; label: string; artist: string | null; artistHref: string | null } {
  if (entry.kind === "list") {
    return {
      href: listHref(entry.author.username, entry.list.title, entry.list.id),
      label: entry.list.title,
      artist: null,
      artistHref: null,
    };
  }
  if (entry.kind === "camino") {
    return {
      href: `/users/${encodeURIComponent(entry.author.username)}/caminos/${entry.camino.id}`,
      label: entry.camino.title,
      artist: null,
      artistHref: null,
    };
  }
  if (entry.kind === "follow") {
    return {
      href: `/users/${encodeURIComponent(entry.followedUser.username)}`,
      label: entry.followedUser.displayName ?? `@${entry.followedUser.username}`,
      artist: null,
      artistHref: null,
    };
  }
  if (entry.kind === "follow-artist") {
    return {
      href: targetHref("artist", entry.artist.id, entry.artist.name),
      label: entry.artist.name,
      artist: null,
      artistHref: null,
    };
  }
  const type = entry.kind === "favorite" ? entry.targetType : entry.target.type;
  return {
    href: targetHref(type, entry.target.id, entry.target.title, entry.target.artistName ?? null),
    label: entry.target.title,
    artist: entry.target.artistName ?? null,
    // Enlaza el nombre del artista a su página cuando el objetivo es un álbum
    // o una canción con artista acreditado (openspec: add-feed-artist-link) —
    // `artistId` viene nulo cuando el objetivo ya es el artista (el título ya
    // enlaza ahí) o cuando no hay artista acreditado.
    artistHref: entry.target.artistId
      ? targetHref("artist", entry.target.artistId, entry.target.artistName ?? "")
      : null,
  };
}

function coverForEntry(entry: FeedEntry): string | null {
  if (entry.kind === "list" || entry.kind === "follow" || entry.kind === "follow-artist" || entry.kind === "camino") {
    return null;
  }
  const type = entry.kind === "favorite" ? entry.targetType : entry.target.type;
  return type === "release-group" ? entry.target.coverThumbUrl : null;
}

// Celda izquierda fija: carátula del objetivo o disco de vinilo. Columna
// rígida — la ausencia de arte no deja hueco. Decorativa: el título va al lado.
function FeedCell({ entry }: { entry: FeedEntry }) {
  return (
    <CoverThumb
      cover={coverForEntry(entry)}
      label=""
      className="size-11 shadow-sm shadow-black/40 ring-1 ring-ink-border sm:size-12"
    />
  );
}

// Línea de metadato: [autor ·] verbo · audiencia, con la fecha relativa a la
// derecha. IBM Plex Mono `text-xs` muted, secundaria al título. En el rastro
// propio se omite el autor.
function MetaLine({
  entry,
  t,
  hideAuthor,
  label,
  iconKind,
  topic,
}: {
  entry: FeedEntry;
  t: FeedT;
  hideAuthor: boolean;
  // Verbo e ícono propios de la fila fusionada de opinión (ver `OpinionRow`).
  label?: string;
  iconKind?: FeedEntry["kind"];
  // Tema del comentario de artista (add-artist-comment-topics); en la fila fusionada el comentario
  // no es la entrada primaria, así que el tema llega aparte.
  topic?: FeedComment["topic"];
}) {
  const audience = audienceLabel(entry, t);
  const commentTopic = topic ?? (entry.kind === "comment" ? entry.topic : null);
  const icon = FEED_KIND_ICONS[iconKind ?? entry.kind];
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 font-data text-xs text-paper-muted">
        {hideAuthor ? null : (
          <>
            <AuthorIdentity author={entry.author} />
            {" · "}
          </>
        )}
        {icon ? (
          <span aria-hidden="true" className="mr-1 inline-flex translate-y-px align-middle">
            {icon}
          </span>
        ) : null}
        {label ?? actionLabel(entry, t)}
        {audience ? ` · ${audience}` : null}
        {commentTopic ? (
          <>
            {" · "}
            <CommentTopicLabel topic={commentTopic} />
          </>
        ) : null}
      </span>
      <RelativeDate iso={entry.createdAt} />
    </div>
  );
}

// Fila fusionada de opinión (openspec: expand-feed-coverage, D6): valoración,
// reseña y/o comentario contiguos del mismo autor sobre el mismo objetivo, en
// una sola fila — verbo compuesto, estrellas con puntaje, reseña y comentario
// como citas. Misma anatomía que una fila normal (celda + columna de texto en
// "feed"; sin celda ni autor en "self").
function OpinionRow({ row, t, self, clamp }: { row: FeedOpinionRow; t: FeedT; self: boolean; clamp: boolean }) {
  const locale = useLocale();
  const primary: FeedEntry = row.rating ?? row.review ?? row.comment!;
  const parts = [row.rating && "rating", row.review && "review", row.comment && "comment"].filter(Boolean);
  const verb = t(`opinion.${parts.join("_")}`);
  const iconKind = row.review ? "review" : "comment";

  const content = (
    <>
      <MetaLine entry={primary} t={t} hideAuthor={self} label={verb} iconKind={iconKind} topic={row.comment?.topic} />
      <TargetTitle {...targetLink(primary)} layout={self ? "inline" : undefined} />
      {row.rating ? <RatingValue entry={row.rating} t={t} locale={locale} /> : null}
      {row.review ? (
        <>
          <ReviewKicker title={row.review.title} />
          <ProsePanel body={row.review.body} variant="comment" clamp={clamp} accent="review" />
        </>
      ) : null}
      {row.comment ? <ProsePanel body={row.comment.body} variant="comment" clamp={clamp} /> : null}
    </>
  );

  if (self) return content;
  return (
    <div className="flex gap-3 sm:gap-4">
      <FeedCell entry={primary} />
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  );
}

function AuthorLink({ author }: { author: FeedEntry["author"] }) {
  return (
    <UserHoverCard username={author.username}>
      <Link
        href={`/users/${encodeURIComponent(author.username)}`}
        className="text-paper transition-colors hover:text-amber"
      >
        {author.displayName ?? `@${author.username}`}
      </Link>
    </UserHoverCard>
  );
}

// Sin foto de perfil real (no existe todavía en el producto), un círculo de
// iniciales le da al autor una unidad visual reconocible — mismo patrón que
// GitHub/Slack/Discord usan como *fallback*, no como maqueta descartable: si
// algún día se suma una foto real, este círculo sigue siendo exactamente ese
// fallback. Resuelve el problema de "sin foto no hay sensación de distinción
// de quién hizo la actividad" (feedback de usuario, 2026-09-05) sin tocar
// backend. Alcance v1: solo /me/feed (no diario, no Inicio) — ver
// openspec/changes/add-feed-filters.
//
// Paleta: 4 variantes tomadas de tokens YA existentes (petrol, ink-border,
// paper-muted y sus hover), nunca ámbar — el acento queda reservado para
// rating y foco, como manda la Regla de Rareza. La variante se elige de forma
// determinística por `id` (estable), no por username (podría cambiar).
const AVATAR_VARIANTS = [
  "bg-petrol text-paper",
  "bg-ink-border text-paper",
  "bg-petrol-hover text-ink",
  "bg-paper-muted text-ink",
] as const;

function avatarVariant(id: string): (typeof AVATAR_VARIANTS)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_VARIANTS[Math.abs(hash) % AVATAR_VARIANTS.length]!;
}

function initialFor(author: FeedEntry["author"]): string {
  const source = author.displayName?.trim() || author.username;
  return source ? source[0]!.toUpperCase() : "?";
}

// Decorativo: el nombre ya lo dice `AuthorLink` al lado — repetirlo acá
// duplicaría el anuncio para lector de pantalla sin agregar información.
function AuthorAvatar({ author }: { author: FeedEntry["author"] }) {
  if (author.avatarUrl) {
    return (
      <AppImage
        src={author.avatarUrl}
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full font-data text-[10px] font-medium leading-none ${avatarVariant(author.id)}`}
    >
      {initialFor(author)}
    </span>
  );
}

function AuthorIdentity({ author }: { author: FeedEntry["author"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <AuthorAvatar author={author} />
      <AuthorLink author={author} />
    </span>
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
