"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "@/components/favorites/ArtistPlate";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ShowcaseResponseSchema, type Favorite, type SocialTargetType } from "@/lib/api/schemas";
import type { IdentityCard, ShowcaseEntity } from "@/services/profiles/showcase";
import { FavoritePicker } from "./FavoritePicker";
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
  const [pendingSlot, setPendingSlot] = useState<SlotKey | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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

      {/* Un slot por fila: en tres columnas el panel lateral (~28 rem) dejaba ~9 rem
          por slot y los títulos se cortaban a tres letras (openspec: improve-favorites-picker). */}
      <div className="flex flex-col gap-3">
        {slots.map((slot) => (
          <div key={slot.key} className="flex flex-col gap-3 rounded border border-ink-border bg-ink p-4">
            <span className="font-data text-sm text-paper-muted">{slot.heading}</span>

            {slot.entity ? (
              <div className="flex items-center gap-3">
                {slot.key === "artist" ? (
                  <ArtistPlate title={slot.entity.title} className="size-14" textClassName="text-xl" />
                ) : (
                  <CoverThumb cover={slot.entity.coverThumbUrl} label="" className="size-14 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 font-display text-base text-paper">{slot.entity.title}</span>
                  {slot.entity.artistName && (
                    <span className="block truncate font-data text-sm text-paper-muted">
                      {slot.entity.artistName}
                    </span>
                  )}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pendingSlot === slot.key}
                  onClick={slot.onClear}
                >
                  {t("identityCard.editor.remove")}
                </Button>
              </div>
            ) : (
              <p className="font-body text-sm text-paper-muted">{slot.emptyLabel}</p>
            )}

            <FavoritePicker
              summary={slot.entity ? t("identityCard.editor.change") : t("identityCard.editor.choose")}
              type={slot.favType}
              excludeIds={slot.entity ? new Set([slot.entity.id]) : undefined}
              emptyLabel={slot.noFavoritesLabel}
              disabled={pendingSlot === slot.key}
              onPick={(favorite) => slot.onChoose(favoriteToEntity(favorite))}
            />
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
