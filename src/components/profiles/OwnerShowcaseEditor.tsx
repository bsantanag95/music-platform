"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { ArtistPlate } from "@/components/favorites/ArtistPlate";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ShowcaseResponseSchema, type Favorite } from "@/lib/api/schemas";
import { PROFILE_IDENTITY_LIMITS, PROFILE_MAX_PINNED } from "@/services/social/types";
import type { Showcase, ShowcaseEntity } from "@/services/profiles/showcase";
import { FavoritePicker } from "./FavoritePicker";
import { useNotifySaved, useReportDirty, type EditorHostCallbacks } from "./editor-host";

interface OwnerShowcaseEditorProps extends EditorHostCallbacks {
  initial: Showcase;
}

interface PinRow {
  entity: ShowcaseEntity;
  note: string;
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

// Editor de "Empieza por aquí" del dueño (openspec: simplify-profile-curation):
// hasta 4 recomendaciones con orden y nota. Siguiendo el precedente del detalle
// de lista (memoria list-detail-scope), NO hay buscador de catálogo embebido: se
// elige de los favoritos del usuario (entidades ya ingeridas, canciones
// incluidas). El himno y el artista/álbum definitorios NO se editan acá: viven
// solo en el editor de la Tarjeta de Identidad. Montado solo en vistas del dueño.

// Firma de los ítems guardables (orden + nota): es el borrador que compara el
// indicador de cambios sin guardar.
function pinSignature(rows: PinRow[]): string {
  return JSON.stringify(rows.map((row) => [row.entity.type, row.entity.id, row.note.trim()]));
}

export function OwnerShowcaseEditor({ initial, onSaved, onDirtyChange }: OwnerShowcaseEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");
  const notifySaved = useNotifySaved(onSaved);
  const idPrefix = useId();

  const [pins, setPins] = useState<PinRow[]>(
    initial.pinned.map((item) => ({ entity: item.entity, note: item.note ?? "" })),
  );
  const [pinStatus, setPinStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(() =>
    pinSignature(initial.pinned.map((item) => ({ entity: item.entity, note: item.note ?? "" }))),
  );
  useReportDirty(pinSignature(pins) !== baseline, onDirtyChange);

  const pinnedIds = new Set(pins.map((row) => row.entity.id));

  function move(index: number, delta: number) {
    setPins((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setPinStatus("idle");
  }

  async function savePins() {
    setPinStatus("saving");
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/pinned", ShowcaseResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: pins.map((row) => ({
            type: row.entity.type,
            id: row.entity.id,
            note: row.note.trim() || null,
          })),
        }),
      });
      const saved = data.showcase.pinned.map((item) => ({ entity: item.entity, note: item.note ?? "" }));
      setPins(saved);
      setBaseline(pinSignature(saved));
      setPinStatus("saved");
      notifySaved();
    } catch (error) {
      setPinStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-display text-sm text-paper-muted">{t("showcase.edit.heading")}</h3>
        <p className="mt-1 font-body text-xs text-paper-muted">{t("showcase.edit.pinnedIntro")}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {pins.map((row, index) => {
          const noteId = `${idPrefix}-note-${row.entity.id}`;
          return (
            <li
              key={row.entity.id}
              className="flex flex-wrap items-start gap-2 rounded border border-ink-border bg-ink p-2"
            >
              {row.entity.type === "artist" ? (
                <ArtistPlate title={row.entity.title} className="size-10" textClassName="text-base" />
              ) : (
                <CoverThumb cover={row.entity.coverThumbUrl} label="" className="size-10" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="block truncate font-display text-sm text-paper">
                  {row.entity.title}
                  {row.entity.artistName && (
                    <span className="font-data text-xs text-paper-muted"> · {row.entity.artistName}</span>
                  )}
                </span>
                <label
                  htmlFor={noteId}
                  className="flex justify-between font-data text-xs text-paper-muted"
                >
                  <span>{t("showcase.edit.noteLabel")}</span>
                  <span aria-hidden>
                    {row.note.length}/{PROFILE_IDENTITY_LIMITS.pinnedNote}
                  </span>
                </label>
                <textarea
                  id={noteId}
                  rows={2}
                  value={row.note}
                  maxLength={PROFILE_IDENTITY_LIMITS.pinnedNote}
                  placeholder={t("showcase.edit.notePlaceholder")}
                  onChange={(event) => {
                    // La nota es una sola frase: los saltos de línea se aplanan.
                    const note = event.target.value.replace(/\s*\n\s*/g, " ");
                    setPins((prev) => prev.map((item, i) => (i === index ? { ...item, note } : item)));
                    setPinStatus("idle");
                  }}
                  className="w-full resize-none rounded border border-ink-border bg-ink-surface px-2.5 py-2 font-body text-sm text-paper placeholder:italic placeholder:text-paper-muted focus:border-amber focus:outline-none"
                />
              </span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("showcase.edit.moveUp")}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("showcase.edit.moveDown")}
                  disabled={index === pins.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={t("showcase.edit.remove")}
                  onClick={() => {
                    setPins((prev) => prev.filter((_, i) => i !== index));
                    setPinStatus("idle");
                  }}
                >
                  ×
                </Button>
              </span>
            </li>
          );
        })}
      </ul>

      {pins.length > 0 && (
        <p className="font-body text-xs text-paper-muted">{t("showcase.edit.noteHint")}</p>
      )}

      {pins.length < PROFILE_MAX_PINNED ? (
        <FavoritePicker
          summary={t("showcase.edit.addFromFavorites")}
          excludeIds={pinnedIds}
          emptyLabel={t("showcase.edit.noFavorites")}
          onPick={(favorite) => {
            setPins((prev) => [...prev, { entity: favoriteToEntity(favorite), note: "" }]);
            setPinStatus("idle");
          }}
        />
      ) : (
        <p className="font-data text-xs text-paper-muted">{t("showcase.edit.maxPinned")}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={() => void savePins()} disabled={pinStatus === "saving"}>
          {pinStatus === "saving" ? t("edit.saving") : t("showcase.edit.savePinned")}
        </Button>
        {pinStatus === "saved" && (
          <span role="status" className="font-data text-xs text-petrol-hover">
            {t("edit.saved")}
          </span>
        )}
      </div>

      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </span>
      )}
    </div>
  );
}
