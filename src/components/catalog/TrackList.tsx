"use client";

import { Fragment, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { createListenEntry, updateListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { deleteRating, saveRating } from "@/lib/api/social";
import { isScoreCoherent } from "@/lib/rating-range";
import { ListenReactionSchema, type ListenEntry, type ListenReaction } from "@/lib/api/schemas";
import { formatDuration, formatStars, summarizeDurations } from "@/components/album/album-format";
import type { AlbumTrack, AlbumCredit } from "@/services/catalog/album-detail";

// Pestaña Canciones de la página de álbum (openspec: redesign-album-page, rehecha en
// rework-album-tracklist). Títulos completos sin truncar; duración, estado personal y menú
// en columnas fijas a la derecha (debajo del título en móvil). Cada fila muestra, siempre
// visible, tu relación con la canción: nota, escuchada y favorito. Las marcas son íconos de
// tamaño fijo para que todas las filas midan lo mismo. El menú "···" sigue el Modelo C:
// primero escucha y reacción, después valoración, favorito y listas.

export interface TrackRatingValue {
  stars: number;
  detailedScore: number | null;
}

interface TrackListProps {
  releaseGroupId: string;
  tracks: AlbumTrack[];
  /** Artistas principales del álbum: una pista de otro artista lo muestra bajo el título. */
  albumArtistIds: string[];
  /** Etiqueta de la edición mostrada (`release.edition_label`). */
  editionLabel: string;
  /** Pestaña Ediciones visible: la línea de edición enlaza a ella. */
  editionsAvailable: boolean;
  authenticated: boolean;
  communityFavoriteIds: string[];
  listenedIds: string[];
  favoriteIds: string[];
  /** Valoraciones propias por `recordingId` (vacío sin sesión). */
  ownRatings?: Record<string, TrackRatingValue>;
}

type Panel =
  | { kind: "logged"; entry: ListenEntry }
  | { kind: "log"; entry: ListenEntry }
  | { kind: "react" }
  | { kind: "rate" }
  | { kind: "addToList" }
  | { kind: "showInLists" };

function trackKey(track: AlbumTrack) {
  return `${track.discNumber}-${track.position}`;
}

function CreditLinks({ credits }: { credits: AlbumCredit[] }) {
  return (
    <>
      {credits.map((credit, index) => (
        <Fragment key={credit.artistId}>
          <Link href={`/artist/${credit.artistId}`} className="text-paper-muted transition-colors hover:text-paper">
            {credit.name}
          </Link>
          {index < credits.length - 1 ? (credit.joinPhrase ?? ", ") : null}
        </Fragment>
      ))}
    </>
  );
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 shrink-0 text-amber">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0 text-petrol-hover">
      <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TrackList({
  releaseGroupId,
  tracks,
  albumArtistIds,
  editionLabel,
  editionsAvailable,
  authenticated,
  communityFavoriteIds,
  listenedIds,
  favoriteIds,
  ownRatings = {},
}: TrackListProps) {
  const t = useTranslations("catalog.album.tracks");
  const tFacts = useTranslations("catalog.album.facts");
  const tCatalog = useTranslations("catalog.album");
  const tDiary = useTranslations("diary");
  const locale = useLocale();
  const router = useRouter();

  const [panel, setPanel] = useState<{ key: string; panel: Panel } | null>(null);
  const [listened, setListened] = useState(() => new Set(listenedIds));
  const [favorites, setFavorites] = useState(() => new Set(favoriteIds));
  const [ratings, setRatings] = useState<Record<string, TrackRatingValue>>(ownRatings);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [confirmRemove, setConfirmRemove] = useState<AlbumTrack | null>(null);
  const [status, setStatus] = useState<{ key: string; message: string; error?: boolean } | null>(null);
  // Solo la última valoración enviada por pista aplica su respuesta (las estrellas no se
  // deshabilitan mientras se guarda, para no perder el foco del teclado).
  const ratingSeq = useRef(new Map<string, number>());
  const communityFavorites = new Set(communityFavoriteIds);
  const albumArtists = new Set(albumArtistIds);

  const discs = new Map<number, AlbumTrack[]>();
  for (const track of tracks) {
    const list = discs.get(track.discNumber) ?? [];
    list.push(track);
    discs.set(track.discNumber, list);
  }
  const discNumbers = Array.from(discs.keys()).sort((a, b) => a - b);
  const multiDisc = discNumbers.length > 1;

  const editionName =
    editionLabel === "standard"
      ? tFacts("editionStandard")
      : editionLabel === "original"
        ? tFacts("editionOriginal")
        : editionLabel;

  function durationText(list: { durationSec: number | null }[]) {
    const summary = summarizeDurations(list);
    const total = formatDuration(summary.totalSeconds);
    return summary.partial ? tFacts("durationPartial", { total }) : total;
  }

  function setBusyKey(key: string, value: boolean) {
    setBusy((current) => {
      const next = new Set(current);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function withStatus(key: string, action: () => Promise<string | null>) {
    setStatus(null);
    try {
      const message = await action();
      if (message) setStatus({ key, message });
    } catch {
      setStatus({ key, message: t("actionError"), error: true });
    }
  }

  function requireSession(action: () => void) {
    return () => {
      if (!authenticated) {
        router.push("/auth/login");
        return;
      }
      action();
    };
  }

  const markListened = (recordingId: string) =>
    setListened((current) => new Set(current).add(recordingId));

  const logListen = (track: AlbumTrack) =>
    withStatus(trackKey(track), async () => {
      const entry = await createListenEntry({ type: "recording", id: track.recordingId });
      markListened(track.recordingId);
      // Confirmación con "Agregar detalles": el formulario solo se abre si se pide.
      setPanel({ key: trackKey(track), panel: { kind: "logged", entry } });
      return null;
    });

  const react = (track: AlbumTrack, reaction: ListenReaction) =>
    withStatus(trackKey(track), async () => {
      const entry = await createListenEntry({ type: "recording", id: track.recordingId });
      await updateListenEntry(entry.id, { reaction });
      markListened(track.recordingId);
      setPanel(null);
      return t("reacted");
    });

  const toggleFav = (track: AlbumTrack) => {
    const key = trackKey(track);
    if (busy.has(`fav-${key}`)) return;
    setBusyKey(`fav-${key}`, true);
    void withStatus(key, async () => {
      try {
        const result = await toggleFavorite({ type: "recording", id: track.recordingId });
        setFavorites((current) => {
          const next = new Set(current);
          if (result) next.add(track.recordingId);
          else next.delete(track.recordingId);
          return next;
        });
        return null;
      } finally {
        setBusyKey(`fav-${key}`, false);
      }
    });
  };

  // Un clic guarda (spec: valoración de pista en línea). Si el puntaje detallado vigente
  // deja de caer en el tramo de las nuevas estrellas, se guarda sin él y se avisa.
  async function rateTrack(track: AlbumTrack, value: number) {
    const key = trackKey(track);
    const seq = (ratingSeq.current.get(key) ?? 0) + 1;
    ratingSeq.current.set(key, seq);
    const previous = ratings[track.recordingId];
    const score = previous?.detailedScore ?? null;
    const keepScore = score !== null && isScoreCoherent(value, score);
    setRatings((current) => ({ ...current, [track.recordingId]: { stars: value, detailedScore: keepScore ? score : null } }));
    setStatus(null);
    try {
      const { rating } = await saveRating("recording", track.recordingId, {
        stars: value,
        ...(keepScore ? { detailedScore: score } : {}),
      });
      if (ratingSeq.current.get(key) !== seq) return;
      setRatings((current) => ({
        ...current,
        [track.recordingId]: { stars: rating.stars, detailedScore: rating.detailedScore },
      }));
      if (score !== null && !keepScore) {
        setStatus({ key, message: t("scoreDropped", { score, stars: formatStars(value, locale) }) });
      }
    } catch {
      if (ratingSeq.current.get(key) !== seq) return;
      setRatings((current) => {
        const next = { ...current };
        if (previous) next[track.recordingId] = previous;
        else delete next[track.recordingId];
        return next;
      });
      setStatus({ key, message: t("actionError"), error: true });
    }
  }

  const removeRating = (track: AlbumTrack) => {
    setConfirmRemove(null);
    void withStatus(trackKey(track), async () => {
      await deleteRating("recording", track.recordingId);
      setRatings((current) => {
        const next = { ...current };
        delete next[track.recordingId];
        return next;
      });
      setPanel(null);
      return null;
    });
  };

  const starsLabel = (value: number) => t("starsValue", { stars: formatStars(value, locale) });

  return (
    <section aria-labelledby="tracklist-heading" className="flex w-full flex-col gap-3">
      {/* La pestaña activa ya dice "Canciones" y la ficha técnica muestra la edición: el
          título queda para lectores de pantalla y la edición solo en móvil, donde la ficha
          está contraída. */}
      <h2 id="tracklist-heading" className="sr-only">
        {t("heading")}
      </h2>
      <p className="font-data text-xs text-paper-muted sm:hidden">
        {t("shownEdition", { edition: editionName })}
        {editionsAvailable && (
          <>
            {" · "}
            <Link href={`/album/${releaseGroupId}/editions`} className="text-amber hover:underline">
              {t("seeEditions")}
            </Link>
          </>
        )}
      </p>
      {communityFavorites.size > 0 && (
        <p className="flex items-center gap-1.5 font-data text-xs text-paper-muted">
          <SparkleIcon />
          {t("communityFavorite")}
        </p>
      )}

      {discNumbers.map((discNumber) => {
        const discTracks = discs.get(discNumber) ?? [];
        return (
          <div key={discNumber} className="flex flex-col">
            {multiDisc && (
              <div className="flex justify-between border-b border-ink-border pb-1 font-data text-xs uppercase tracking-wider text-paper-muted">
                <h3>{tCatalog("discLabel", { number: discNumber })}</h3>
                <span>
                  {t("discSummary", { tracks: discTracks.length, duration: durationText(discTracks) })}
                </span>
              </div>
            )}
            <ol className="flex flex-col divide-y divide-ink-border">
              {discTracks.map((track) => {
                const key = trackKey(track);
                const featured = track.credits.filter((c) => c.role === "featured");
                const primary = track.credits.filter((c) => c.role === "primary");
                const otherArtist =
                  primary.length > 0 && primary.some((c) => !albumArtists.has(c.artistId)) ? primary : [];
                const variant = track.variantType !== "original" ? track.variantType : null;
                const isCommunityFavorite = communityFavorites.has(track.recordingId);
                const isListened = authenticated && listened.has(track.recordingId);
                const isFavorite = favorites.has(track.recordingId);
                const own = ratings[track.recordingId];
                const duration =
                  track.durationSec === null ? tCatalog("durationUnknown") : formatDuration(track.durationSec);
                const openPanel = panel?.key === key ? panel.panel : null;
                const rowStatus = status?.key === key ? status : null;

                // Tu relación con la pista, en anchos fijos para que las columnas alineen.
                const personal = authenticated ? (
                  <span className="flex items-center gap-2">
                    <span className="flex w-[3.75rem] justify-end">
                      {own && (
                        <button
                          type="button"
                          onClick={() => setPanel({ key, panel: { kind: "rate" } })}
                          aria-label={t("editOwnRating", { title: track.title, stars: formatStars(own.stars, locale) })}
                          className="rounded"
                        >
                          <StarRatingDisplay value={own.stars} label={t("ownRating", { stars: formatStars(own.stars, locale) })} />
                        </button>
                      )}
                    </span>
                    <span className="flex w-4 justify-center" title={isListened ? t("youListened") : undefined}>
                      {isListened && (
                        <>
                          <CheckIcon />
                          <span className="sr-only">{t("youListened")}</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      aria-pressed={isFavorite}
                      aria-label={t("favoriteToggle", { title: track.title })}
                      disabled={busy.has(`fav-${key}`)}
                      onClick={() => toggleFav(track)}
                      className={`flex size-7 items-center justify-center rounded transition-colors hover:text-amber disabled:opacity-50 ${
                        isFavorite ? "text-amber" : "text-paper-muted/50"
                      }`}
                    >
                      <HeartIcon filled={isFavorite} />
                    </button>
                  </span>
                ) : null;

                return (
                  <li
                    key={key}
                    className="-mx-2 flex flex-col px-2 py-2 transition-colors sm:focus-within:bg-ink-surface sm:hover:bg-ink-surface"
                  >
                    <div
                      className={`grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] items-start gap-x-3 ${
                        authenticated
                          ? "sm:grid-cols-[2rem_minmax(0,1fr)_7.5rem_3.5rem_2rem]"
                          : "sm:grid-cols-[2rem_minmax(0,1fr)_3.5rem_2rem]"
                      }`}
                    >
                      <span className="flex h-7 items-center justify-end font-data text-xs text-paper-muted">{track.position}</span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-body leading-7 text-paper [overflow-wrap:anywhere]">
                          <Link href={`/song/${track.recordingId}`} className="hover:text-amber">
                            {track.title}
                          </Link>
                          {isCommunityFavorite && (
                            <span className="ml-1.5 inline-flex align-middle" title={t("communityFavorite")}>
                              <SparkleIcon />
                              <span className="sr-only">{t("communityFavorite")}</span>
                            </span>
                          )}
                          {variant && (
                            <span className="ml-2 rounded border border-ink-border px-1.5 py-0.5 align-middle font-data text-xs text-paper-muted">
                              {t(`variant.${variant}`)}
                            </span>
                          )}
                        </span>
                        {otherArtist.length > 0 && (
                          <span className="font-data text-xs">
                            <CreditLinks credits={otherArtist} />
                          </span>
                        )}
                        {featured.length > 0 && (
                          <span className="font-data text-xs text-paper-muted">
                            {tCatalog("creditsLabel")}: <CreditLinks credits={featured} />
                          </span>
                        )}
                        {track.variantOf && (
                          <span className="font-data text-xs text-paper-muted">
                            <Link href={`/song/${track.variantOf.recordingId}`} className="hover:text-paper hover:underline">
                              {t("versionOf", { title: track.variantOf.title })}
                            </Link>
                          </span>
                        )}
                        <span className="flex items-center gap-3 font-data text-xs text-paper-muted sm:hidden">
                          <span>{duration}</span>
                          {personal}
                        </span>
                      </div>
                      {authenticated && <span className="hidden h-7 items-center justify-end sm:flex">{personal}</span>}
                      <span
                        className="hidden h-7 items-center justify-end font-data text-xs text-paper-muted sm:flex"
                        aria-label={`${tCatalog("durationLabel")}: ${duration}`}
                      >
                        {duration}
                      </span>
                      <span className="flex h-7 items-center justify-end">
                        <RowMenu label={t("menuLabel", { title: track.title })} triggerClassName="size-10 sm:size-8">
                          <RowMenuItem onSelect={requireSession(() => void logListen(track))}>
                            {t("menu.logListen")}
                          </RowMenuItem>
                          <RowMenuItem onSelect={requireSession(() => setPanel({ key, panel: { kind: "react" } }))}>
                            {t("menu.react")}
                          </RowMenuItem>
                          <RowMenuItem onSelect={requireSession(() => setPanel({ key, panel: { kind: "rate" } }))}>
                            {t("menu.rate")}
                          </RowMenuItem>
                          <RowMenuItem onSelect={requireSession(() => toggleFav(track))}>
                            {isFavorite ? t("menu.unfavorite") : t("menu.favorite")}
                          </RowMenuItem>
                          <RowMenuItem onSelect={requireSession(() => setPanel({ key, panel: { kind: "addToList" } }))}>
                            {t("menu.addToList")}
                          </RowMenuItem>
                          <RowMenuItem onSelect={() => setPanel({ key, panel: { kind: "showInLists" } })}>
                            {t("menu.showInLists")}
                          </RowMenuItem>
                        </RowMenu>
                      </span>
                    </div>

                    {rowStatus && (
                      <p
                        role={rowStatus.error ? "alert" : "status"}
                        className={`mt-2 pl-[2.75rem] font-data text-xs ${rowStatus.error ? "text-danger" : "text-petrol-hover"}`}
                      >
                        {rowStatus.message}
                      </p>
                    )}

                    {openPanel && (
                      <div className="mt-2 flex flex-col gap-2 pl-[2.75rem]">
                        {openPanel.kind === "logged" && (
                          <p role="status" className="font-data text-xs text-petrol-hover">
                            {t("logged")} ·{" "}
                            <button
                              type="button"
                              onClick={() => setPanel({ key, panel: { kind: "log", entry: openPanel.entry } })}
                              className="text-amber underline-offset-2 hover:underline"
                            >
                              {t("addDetails")}
                            </button>
                          </p>
                        )}
                        {openPanel.kind === "log" && (
                          <ListenEntryForm
                            entryId={openPanel.entry.id}
                            target={openPanel.entry.target}
                            initial={{
                              listenContext: openPanel.entry.listenContext,
                              body: openPanel.entry.body,
                              reaction: openPanel.entry.reaction,
                              audience: openPanel.entry.audience,
                            }}
                            onSaved={() => setPanel(null)}
                          />
                        )}
                        {openPanel.kind === "react" && (
                          <div role="group" aria-label={t("menu.react")} className="flex flex-wrap gap-2">
                            {ListenReactionSchema.options.map((reaction) => (
                              <button
                                key={reaction}
                                type="button"
                                onClick={() => void react(track, reaction)}
                                className="rounded border border-ink-border px-3 py-1 font-data text-xs text-paper hover:border-amber"
                              >
                                {tDiary(`reaction.${reaction}`)}
                              </button>
                            ))}
                          </div>
                        )}
                        {openPanel.kind === "rate" && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <StarRatingInput
                              value={own?.stars ?? null}
                              onChange={(value) => void rateTrack(track, value)}
                              legend={t("starsLegend", { title: track.title })}
                              valueLabel={starsLabel}
                            />
                            {own && (
                              <button
                                type="button"
                                onClick={() => setConfirmRemove(track)}
                                className="font-data text-xs text-danger underline-offset-2 hover:underline"
                              >
                                {t("removeRating")}
                              </button>
                            )}
                          </div>
                        )}
                        {openPanel.kind === "addToList" && (
                          <AddToListPanel
                            target={{ type: "recording", id: track.recordingId }}
                            onClose={() => setPanel(null)}
                          />
                        )}
                        {openPanel.kind === "showInLists" && (
                          <ListsContainingItemPanel
                            target={{ type: "recording", id: track.recordingId }}
                            canSave={authenticated}
                            onClose={() => setPanel(null)}
                          />
                        )}
                        {openPanel.kind !== "addToList" && openPanel.kind !== "showInLists" && (
                          <button
                            type="button"
                            onClick={() => setPanel(null)}
                            className="self-start font-data text-xs text-paper-muted underline hover:text-paper"
                          >
                            {t("close")}
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}

      {/* Con un solo disco el total ya está en la ficha técnica ("12 pistas · 38:24"). */}
      {multiDisc && (
        <div className="flex justify-between border-t border-ink-border pt-2 font-data text-xs text-paper-muted">
          <span>{t("total", { tracks: tracks.length })}</span>
          <span>{durationText(tracks)}</span>
        </div>
      )}

      <ConfirmDialog
        open={confirmRemove !== null}
        title={t("removeRatingTitle")}
        message={t("removeRatingMessage")}
        confirmLabel={t("removeRatingConfirm")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => confirmRemove && removeRating(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />
    </section>
  );
}
