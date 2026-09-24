"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { AddToListPanel } from "@/components/lists/AddToListPanel";
import { ListenEntryForm } from "@/components/diary/ListenEntryForm";
import { DualRating } from "@/components/social/DualRating";
import { createListenEntry, updateListenEntry } from "@/lib/api/diary";
import { toggleFavorite } from "@/lib/api/favorites";
import { getRatings } from "@/lib/api/social";
import { ListenReactionSchema, type ListenEntry, type ListenReaction, type RatingsResponse } from "@/lib/api/schemas";
import { formatDuration, summarizeDurations } from "@/components/album/album-format";
import type { AlbumTrack, AlbumCredit } from "@/services/catalog/album-detail";

// Pestaña Canciones de la página de álbum (openspec: redesign-album-page). Títulos
// completos sin truncar; duración, marcas y menú en columnas fijas a la derecha (debajo del
// título en móvil). Cada pista muestra su variante, el artista cuando difiere del álbum,
// si es favorita de la comunidad y, con sesión, si ya la escuchaste. El menú "···" sigue el
// Modelo C: primero escucha y reacción, después valoración, favorito y listas.

interface TrackListProps {
  releaseGroupId: string;
  tracks: AlbumTrack[];
  /** Artistas principales del álbum: una pista de otro artista lo muestra bajo el título. */
  albumArtistIds: string[];
  /** Etiqueta de la edición mostrada (`release.edition_label`). */
  editionLabel: string;
  /** Pestaña Ediciones visible: el encabezado enlaza a ella. */
  editionsAvailable: boolean;
  authenticated: boolean;
  communityFavoriteIds: string[];
  listenedIds: string[];
  favoriteIds: string[];
}

type Panel =
  | { kind: "log"; entry: ListenEntry }
  | { kind: "react" }
  | { kind: "rate"; ratings: RatingsResponse }
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
}: TrackListProps) {
  const t = useTranslations("catalog.album.tracks");
  const tFacts = useTranslations("catalog.album.facts");
  const tCatalog = useTranslations("catalog.album");
  const tDiary = useTranslations("diary");
  const router = useRouter();

  const [panel, setPanel] = useState<{ key: string; panel: Panel } | null>(null);
  const [listened, setListened] = useState(() => new Set(listenedIds));
  const [favorites, setFavorites] = useState(() => new Set(favoriteIds));
  const [status, setStatus] = useState<{ key: string; message: string; error?: boolean } | null>(null);
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
      setPanel({ key: trackKey(track), panel: { kind: "log", entry } });
      return t("logged");
    });

  const react = (track: AlbumTrack, reaction: ListenReaction) =>
    withStatus(trackKey(track), async () => {
      const entry = await createListenEntry({ type: "recording", id: track.recordingId });
      await updateListenEntry(entry.id, { reaction });
      markListened(track.recordingId);
      setPanel(null);
      return t("reacted");
    });

  const openRating = (track: AlbumTrack) =>
    withStatus(trackKey(track), async () => {
      const ratings = await getRatings("recording", track.recordingId);
      setPanel({ key: trackKey(track), panel: { kind: "rate", ratings } });
      return null;
    });

  const toggleFav = (track: AlbumTrack) =>
    withStatus(trackKey(track), async () => {
      const result = await toggleFavorite({ type: "recording", id: track.recordingId });
      setFavorites((current) => {
        const next = new Set(current);
        if (result) next.add(track.recordingId);
        else next.delete(track.recordingId);
        return next;
      });
      return null;
    });

  return (
    <section aria-labelledby="tracklist-heading" className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="tracklist-heading" className="font-display text-xl text-paper">
          {t("heading")}
        </h2>
        <p className="font-data text-xs text-paper-muted">
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
      </div>

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
                const duration =
                  track.durationSec === null ? tCatalog("durationUnknown") : formatDuration(track.durationSec);
                const openPanel = panel?.key === key ? panel.panel : null;
                const rowStatus = status?.key === key ? status : null;

                const marks = (
                  <>
                    <span className="inline-flex w-5 justify-center text-amber" title={isCommunityFavorite ? t("communityFavorite") : undefined}>
                      {isCommunityFavorite && (
                        <>
                          <span aria-hidden="true">✦</span>
                          <span className="sr-only">{t("communityFavorite")}</span>
                        </>
                      )}
                    </span>
                    <span className="inline-flex w-5 justify-center text-petrol-hover" title={isListened ? t("youListened") : undefined}>
                      {isListened && (
                        <>
                          <span aria-hidden="true">✓</span>
                          <span className="sr-only">{t("youListened")}</span>
                        </>
                      )}
                    </span>
                  </>
                );

                return (
                  <li key={key} className="flex flex-col py-3">
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-baseline gap-x-3 sm:grid-cols-[2rem_minmax(0,1fr)_2.75rem_3.5rem_1.5rem]">
                      <span className="text-right font-data text-xs text-paper-muted">{track.position}</span>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-body text-paper [overflow-wrap:anywhere]">
                          <Link href={`/song/${track.recordingId}`} className="hover:text-amber">
                            {track.title}
                          </Link>
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
                        <span className="flex items-center gap-2 font-data text-xs text-paper-muted sm:hidden">
                          <span>{duration}</span>
                          {marks}
                        </span>
                      </div>
                      <span className="hidden items-center sm:flex">{marks}</span>
                      <span
                        className="hidden text-right font-data text-xs text-paper-muted sm:block"
                        aria-label={`${tCatalog("durationLabel")}: ${duration}`}
                      >
                        {duration}
                      </span>
                      <RowMenu label={t("menuLabel", { title: track.title })}>
                        <RowMenuItem onSelect={requireSession(() => void logListen(track))}>
                          {t("menu.logListen")}
                        </RowMenuItem>
                        <RowMenuItem onSelect={requireSession(() => setPanel({ key, panel: { kind: "react" } }))}>
                          {t("menu.react")}
                        </RowMenuItem>
                        <RowMenuItem onSelect={requireSession(() => void openRating(track))}>
                          {t("menu.rate")}
                        </RowMenuItem>
                        <RowMenuItem onSelect={requireSession(() => void toggleFav(track))}>
                          {favorites.has(track.recordingId) ? t("menu.unfavorite") : t("menu.favorite")}
                        </RowMenuItem>
                        <RowMenuItem onSelect={requireSession(() => setPanel({ key, panel: { kind: "addToList" } }))}>
                          {t("menu.addToList")}
                        </RowMenuItem>
                        <RowMenuItem onSelect={() => setPanel({ key, panel: { kind: "showInLists" } })}>
                          {t("menu.showInLists")}
                        </RowMenuItem>
                        <RowMenuItem onSelect={() => router.push(`/song/${track.recordingId}`)}>
                          {t("menu.goToSong")}
                        </RowMenuItem>
                      </RowMenu>
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
                      <div className="mt-3 flex flex-col gap-2 pl-[2.75rem]">
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
                            onSaved={(entry) => setPanel({ key, panel: { kind: "log", entry } })}
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
                          <DualRating
                            target="recording"
                            targetId={track.recordingId}
                            initial={openPanel.ratings}
                            authenticated
                            variant="starsOnly"
                          />
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

      <div className="flex justify-between border-t border-ink-border pt-2 font-data text-xs text-paper-muted">
        <span>{t("total", { tracks: tracks.length })}</span>
        <span>{durationText(tracks)}</span>
      </div>
    </section>
  );
}
