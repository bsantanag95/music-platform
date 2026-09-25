"use client";

import { useState, type SubmitEventHandler } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { ApiError } from "@/lib/api/client";
import { deleteRating, getRatings, highlightRating, saveRating, unhighlightRating } from "@/lib/api/social";
import type { RatingsResponse } from "@/lib/api/schemas";
import { isScoreCoherent, scoreRange } from "@/lib/rating-range";
import { formatStars } from "./album-format";

// Diálogo de la valoración propia del panel "Tu relación" (openspec:
// rework-album-relation-panel, D3): puntaje detallado limitado al tramo de las estrellas
// vigentes, destacar en el perfil y borrar la nota. Las estrellas se eligen en el panel;
// aquí solo se afinan. `ui/Dialog` devuelve el foco al botón que lo abrió al cerrar.

interface RatingDetailDialogProps {
  open: boolean;
  onClose: () => void;
  releaseGroupId: string;
  /** Valoración propia vigente; el diálogo solo se abre con estrellas elegidas. */
  own: NonNullable<RatingsResponse["own"]>;
  onChange: (ratings: RatingsResponse) => void;
}

export function RatingDetailDialog({ open, onClose, releaseGroupId, own, onChange }: RatingDetailDialogProps) {
  const t = useTranslations("catalog.album.relation.detail");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const { min, max } = scoreRange(own.stars);
  const [score, setScore] = useState(own.detailedScore?.toString() ?? "");
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const parsed = score === "" ? null : Number(score);
  const valid = isScoreCoherent(own.stars, parsed);

  async function run(action: () => Promise<void>) {
    setPending(true);
    setErrorCode(null);
    try {
      await action();
    } catch (error) {
      setErrorCode(error instanceof ApiError ? error.code : "INTERNAL_ERROR");
    } finally {
      setPending(false);
    }
  }

  const refresh = async () => onChange(await getRatings("release-group", releaseGroupId));

  const save: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!valid) return;
    void run(async () => {
      await saveRating("release-group", releaseGroupId, {
        stars: own.stars,
        ...(parsed !== null ? { detailedScore: parsed } : {}),
      });
      await refresh();
      onClose();
    });
  };

  const toggleHighlight = () =>
    void run(async () => {
      await (own.isHighlighted ? unhighlightRating(own.id) : highlightRating(own.id));
      await refresh();
    });

  const remove = () => {
    setConfirmDelete(false);
    void run(async () => {
      await deleteRating("release-group", releaseGroupId);
      await refresh();
      onClose();
    });
  };

  return (
    <>
      <Dialog open={open && !confirmDelete} title={t("title")} onClose={onClose}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 font-data text-sm text-paper">
            {t("scoreLabel", { stars: formatStars(own.stars, locale) })}
            <input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              aria-invalid={!valid}
              aria-describedby="rating-detail-hint"
              className="w-28 rounded border border-ink-border bg-ink px-3 py-2 text-paper aria-[invalid=true]:border-danger"
            />
          </label>
          <p id="rating-detail-hint" className="-mt-2 font-data text-xs text-paper-muted">
            {t("hint", { min, max })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !valid}>
              {pending ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
              {t("cancel")}
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-border pt-4">
          <button
            type="button"
            disabled={pending}
            aria-pressed={own.isHighlighted ?? false}
            onClick={toggleHighlight}
            className="font-data text-xs text-paper-muted underline-offset-2 hover:text-paper hover:underline aria-pressed:text-amber disabled:opacity-50"
          >
            {own.isHighlighted ? t("unhighlight") : t("highlight")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
            className="font-data text-xs text-danger underline-offset-2 hover:underline disabled:opacity-50"
          >
            {t("delete")}
          </button>
        </div>
        {errorCode && (
          <p role="alert" className="font-data text-xs text-danger">
            {tErrors(`${errorCode}.description`)}
          </p>
        )}
      </Dialog>
      <ConfirmDialog
        open={open && confirmDelete}
        title={t("deleteTitle")}
        message={t("deleteMessage")}
        confirmLabel={t("deleteConfirm")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
