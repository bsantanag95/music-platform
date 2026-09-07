"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { apiFetch, ApiError } from "@/lib/api/client";
import { getMyFavorites } from "@/lib/api/favorites";
import { ShowcaseResponseSchema, type Favorite } from "@/lib/api/schemas";
import { PROFILE_IDENTITY_LIMITS, PROFILE_MAX_PINNED } from "@/services/social/types";
import type { Showcase, ShowcaseEntity } from "@/services/profiles/showcase";

interface OwnerShowcaseEditorProps {
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

// Editor inline de destacados e himno del dueño. Siguiendo el precedente del
// detalle de lista (memoria list-detail-scope), NO hay buscador de catálogo
// embebido: se elige de los favoritos del usuario (entidades ya ingeridas,
// canciones incluidas). Montado solo en la vista del propio perfil.
export function OwnerShowcaseEditor({ initial }: OwnerShowcaseEditorProps) {
  const t = useTranslations("users");
  const tErrors = useTranslations("errors");

  const [pins, setPins] = useState<PinRow[]>(
    initial.pinned.map((item) => ({ entity: item.entity, note: item.note ?? "" })),
  );
  const [anthem, setAnthem] = useState<ShowcaseEntity | null>(initial.anthem);
  const [favorites, setFavorites] = useState<Favorite[] | null>(null);
  const [recordingFavorites, setRecordingFavorites] = useState<Favorite[] | null>(null);
  const [pinStatus, setPinStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const pinnedIds = new Set(pins.map((row) => row.entity.id));

  async function loadFavorites() {
    if (favorites) return;
    try {
      const result = await getMyFavorites(1, 50);
      setFavorites(result.favorites);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  async function loadRecordingFavorites() {
    if (recordingFavorites) return;
    try {
      const result = await getMyFavorites(1, 50, { type: "recording" });
      setRecordingFavorites(result.favorites);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

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
      await apiFetch("/api/me/profile/pinned", ShowcaseResponseSchema, {
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
      setPinStatus("saved");
    } catch (error) {
      setPinStatus("idle");
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  async function chooseAnthem(entity: ShowcaseEntity) {
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/anthem", ShowcaseResponseSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingId: entity.id }),
      });
      setAnthem(data.showcase.anthem);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  async function clearAnthem() {
    setErrorCode(null);
    try {
      const data = await apiFetch("/api/me/profile/anthem", ShowcaseResponseSchema, {
        method: "DELETE",
      });
      setAnthem(data.showcase.anthem);
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h3 className="font-display text-sm text-paper-muted">{t("showcase.edit.heading")}</h3>

      {/* Destacados */}
      <section className="flex flex-col gap-3">
        <p className="font-body text-xs text-paper-muted">{t("showcase.edit.pinnedIntro")}</p>

        <ul className="flex flex-col gap-2">
          {pins.map((row, index) => (
            <li
              key={row.entity.id}
              className="flex flex-wrap items-center gap-2 rounded border border-ink-border bg-ink p-2"
            >
              <CoverThumb cover={row.entity.coverThumbUrl} label="" className="size-10" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-sm text-paper">
                  {row.entity.title}
                </span>
                <input
                  value={row.note}
                  maxLength={PROFILE_IDENTITY_LIMITS.pinnedNote}
                  placeholder={t("showcase.edit.notePlaceholder")}
                  onChange={(event) => {
                    const note = event.target.value;
                    setPins((prev) =>
                      prev.map((item, i) => (i === index ? { ...item, note } : item)),
                    );
                    setPinStatus("idle");
                  }}
                  className="mt-1 w-full rounded border border-ink-border bg-ink-surface px-2 py-1 font-body text-xs text-paper placeholder:text-paper-muted"
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
          ))}
        </ul>

        {pins.length < PROFILE_MAX_PINNED ? (
          <details onToggle={() => void loadFavorites()}>
            <summary className="cursor-pointer font-data text-xs text-paper-muted hover:text-paper">
              {t("showcase.edit.addFromFavorites")}
            </summary>
            <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
              {favorites?.length === 0 && (
                <li className="font-body text-xs text-paper-muted">
                  {t("showcase.edit.noFavorites")}
                </li>
              )}
              {favorites
                ?.filter((favorite) => !pinnedIds.has(favorite.target.id))
                .map((favorite) => (
                  <li key={favorite.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPins((prev) => [
                          ...prev,
                          { entity: favoriteToEntity(favorite), note: "" },
                        ]);
                        setPinStatus("idle");
                      }}
                      className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink-surface px-2 py-1.5 text-left transition-colors hover:border-amber"
                    >
                      <CoverThumb
                        cover={favorite.target.coverThumbUrl}
                        label=""
                        className="size-8"
                      />
                      <span className="truncate font-body text-xs text-paper">
                        {favorite.target.title}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </details>
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
      </section>

      {/* Himno */}
      <section className="flex flex-col gap-3">
        <p className="font-body text-xs text-paper-muted">{t("showcase.edit.anthemIntro")}</p>

        {anthem && (
          <div className="flex items-center gap-3 rounded border border-ink-border bg-ink p-2">
            <span className="min-w-0 flex-1">
              <span className="block font-data text-xs text-paper-muted">
                {t("showcase.edit.currentAnthem")}
              </span>
              <span className="block truncate font-display text-sm text-paper">{anthem.title}</span>
            </span>
            <Button type="button" variant="ghost" onClick={() => void clearAnthem()}>
              {t("showcase.edit.clearAnthem")}
            </Button>
          </div>
        )}

        <details onToggle={() => void loadRecordingFavorites()}>
          <summary className="cursor-pointer font-data text-xs text-paper-muted hover:text-paper">
            {t("showcase.edit.addFromFavorites")}
          </summary>
          <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {recordingFavorites?.length === 0 && (
              <li className="font-body text-xs text-paper-muted">
                {t("showcase.edit.noRecordingFavorites")}
              </li>
            )}
            {recordingFavorites?.map((favorite) => (
              <li key={favorite.id}>
                <button
                  type="button"
                  onClick={() => void chooseAnthem(favoriteToEntity(favorite))}
                  className="flex w-full items-center gap-2 rounded border border-ink-border bg-ink-surface px-2 py-1.5 text-left transition-colors hover:border-amber"
                >
                  <span className="truncate font-body text-xs text-paper">
                    {favorite.target.title}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      </section>

      {errorCode && (
        <span role="alert" className="font-data text-xs text-danger">
          {tErrors(`${errorCode}.description`)}
        </span>
      )}
    </div>
  );
}
