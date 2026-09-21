"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getMyFavorites } from "@/lib/api/favorites";
import { ShowcaseResponseSchema, type Favorite, type SocialTargetType } from "@/lib/api/schemas";
import type { IdentityCard, ShowcaseEntity } from "@/services/profiles/showcase";
import { useNotifySaved, type EditorHostCallbacks } from "./editor-host";

// Aplica cada cambio al instante (no hay borrador), así que solo usa `onSaved`.
interface OwnerIdentityCardEditorProps extends Pick<EditorHostCallbacks, "onSaved"> {
  initial: IdentityCard;
}

type SlotKey = "artist" | "album" | "song";

interface Slot {
  key: SlotKey;
  favType: SocialTargetType;
  heading: string;
  entity: ShowcaseEntity | null;
  emptyLabel: string;
  noFavoritesLabel: string;
  onChoose: (entity: ShowcaseEntity) => void;
  onClear: () => void;
}

function favoriteToEntity(favorite: Favorite): ShowcaseEntity {
  return {
    type: favorite.targetType,
    id: favorite.target.id,
    title: favorite.target.title,
    artistName: favorite.target.artistName ?? null,
    coverThumbUrl: favorite.target.coverThumbUrl,
  };
}

// Editor unificado de la Tarjeta de Identidad (openspec: rework-user-profile):
// un solo bloque, arriba de Gestión, con los 3 slots que definen al dueño
// (artista, álbum, canción). Es el ÚNICO editor de estos tres datos
// (openspec: simplify-profile-curation): los marcadores ★ y la sección "Himno"
// de los editores de "Empieza por aquí" y de Álbumes favoritos se retiraron.
export function OwnerIdentityCardEditor({ initial, onSaved }: OwnerIdentityCardEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);

  const [identityCard, setIdentityCard] = useState<IdentityCard>(initial);
  const [favorites, setFavorites] = useState<Partial<Record<SocialTargetType, Favorite[]>>>({});
  const [pendingSlot, setPendingSlot] = useState<SlotKey | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function loadFavoritesFor(type: SocialTargetType) {
    if (favorites[type]) return;
    try {
      const result = await getMyFavorites(1, 50, { type });
      setFavorites((prev) => ({ ...prev, [type]: result.favorites }));
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  async function chooseDefining(type: "artist" | "release-group", entity: ShowcaseEntity, slot: SlotKey) {
    setPendingSlot(slot);
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/pinned/defining", ShowcaseResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: entity.id }),
      });
      setIdentityCard(data.showcase.identityCard);
      notifySaved();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPendingSlot(null);
    }
  }

  async function clearDefining(type: "artist" | "release-group", entity: ShowcaseEntity, slot: SlotKey) {
    setPendingSlot(slot);
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/pinned/defining", ShowcaseResponseSchema, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: entity.id }),
      });
      setIdentityCard(data.showcase.identityCard);
      notifySaved();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPendingSlot(null);
    }
  }

  async function chooseSong(entity: ShowcaseEntity) {
    setPendingSlot("song");
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/anthem", ShowcaseResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId: entity.id }),
      });
      setIdentityCard(data.showcase.identityCard);
      notifySaved();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPendingSlot(null);
    }
  }

  async function clearSong() {
    setPendingSlot("song");
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/anthem", ShowcaseResponseSchema, { method: "DELETE" });
      setIdentityCard(data.showcase.identityCard);
      notifySaved();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPendingSlot(null);
    }
  }

  const slots: Slot[] = [
    {
      key: "artist",
      favType: "artist",
      heading: t("identityCard.artistHeading"),
      entity: identityCard.artist,
      emptyLabel: t("identityCard.editor.emptyArtist"),
      noFavoritesLabel: t("identityCard.editor.noArtistFavorites"),
      onChoose: (entity) => void chooseDefining("artist", entity, "artist"),
      onClear: () => identityCard.artist && void clearDefining("artist", identityCard.artist, "artist"),
    },
    {
      key: "album",
      favType: "release-group",
      heading: t("identityCard.albumHeading"),
      entity: identityCard.album,
      emptyLabel: t("identityCard.editor.emptyAlbum"),
      noFavoritesLabel: t("identityCard.editor.noAlbumFavorites"),
      onChoose: (entity) => void chooseDefining("release-group", entity, "album"),
      onClear: () => identityCard.album && void clearDefining("release-group", identityCard.album, "album"),
    },
    {
      key: "song",
      favType: "recording",
      heading: t("identityCard.songHeading"),
      entity: identityCard.anthem,
      emptyLabel: t("identityCard.editor.emptySong"),
      noFavoritesLabel: t("identityCard.editor.noSongFavorites"),
      onChoose: (entity) => void chooseSong(entity),
      onClear: () => void clearSong(),
    },
  ];

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-sm text-paper-muted">{t("identityCard.editor.heading")}</h3>
        <p className="mt-1 font-body text-xs text-paper-muted">{t("identityCard.editor.intro")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {slots.map((slot) => (
          <div key={slot.key} className="flex flex-col gap-2 rounded border border-ink-border bg-ink p-3">
            <span className="font-data text-xs text-paper-muted">{slot.heading}</span>

            {slot.entity ? (
              <div className="flex items-center gap-2">
                <CoverThumb cover={slot.entity.coverThumbUrl} label="" className="size-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm text-paper">{slot.entity.title}</span>
                  {slot.entity.artistName && (
                    <span className="block truncate font-data text-xs text-paper-muted">
                      {slot.entity.artistName}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              <p className="font-body text-xs text-paper-muted">{slot.emptyLabel}</p>
            )}

            <details onToggle={() => void loadFavoritesFor(slot.favType)}>
              <summary className="cursor-pointer font-data text-xs text-paper-muted hover:text-paper">
                {slot.entity ? t("identityCard.editor.change") : t("identityCard.editor.choose")}
              </summary>
              <ul className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
                {favorites[slot.favType]?.length === 0 && (
                  <li className="font-body text-xs text-paper-muted">{slot.noFavoritesLabel}</li>
                )}
                {favorites[slot.favType]
                  ?.filter((favorite) => favorite.target.id !== slot.entity?.id)
                  .map((favorite) => (
                    <li key={favorite.id}>
                      <button
                        type="button"
                        disabled={pendingSlot === slot.key}
                        onClick={() => slot.onChoose(favoriteToEntity(favorite))}
                        className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink-surface px-2 py-1.5 text-left transition-colors hover:border-amber disabled:opacity-50"
                      >
                        <CoverThumb cover={favorite.target.coverThumbUrl} label="" className="size-8" />
                        <span className="truncate font-body text-xs text-paper">{favorite.target.title}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </details>

            {slot.entity && (
              <Button
                type="button"
                variant="ghost"
                disabled={pendingSlot === slot.key}
                onClick={slot.onClear}
              >
                {t("identityCard.editor.remove")}
              </Button>
            )}
          </div>
        ))}
      </div>

      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </span>
      )}
    </section>
  );
}
