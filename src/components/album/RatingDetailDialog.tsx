"use client";

import { useId, useState, type KeyboardEvent, type SubmitEventHandler } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { StarRatingDisplay } from "@/components/social/StarRatingDisplay";
import { ApiError } from "@/lib/api/client";
import { deleteRating, getRatings, highlightRating, saveRating, unhighlightRating } from "@/lib/api/social";
import type { RatingsResponse } from "@/lib/api/schemas";
import { scoreRange, starsFromScore } from "@/lib/rating-range";
import { formatStars } from "./album-format";

// Diálogo de la valoración propia del panel "Tu relación" (openspec:
// refine-detailed-score-dialog). El puntaje se elige con un deslizador: con estrellas se
// limita a su tramo (4★ → 71–80) y guardar no las cambia; sin estrellas va de 1 a 100 y una
// fila de estrellas en vivo muestra cuáles le corresponden. Guardar envía solo el puntaje;
// el servidor deriva las estrellas. `ui/Dialog` devuelve el foco al botón que lo abrió al
// cerrar y cierra con Escape.

const FULL_RANGE = { min: 1, max: 100 };
const PAGE_STEP = 10;
// Los diez tramos de la ayuda: ½★ (1–10) … 5★ (91–100).
const BANDS = Array.from({ length: 10 }, (_, index) => (index + 1) / 2);

interface RatingDetailDialogProps {
  open: boolean;
  onClose: () => void;
  /** Álbum o canción valorada (la canción usa el mismo diálogo: openspec redesign-song-page). */
  target: { type: "release-group" | "recording"; id: string };
  /** Valoración propia vigente; ausente cuando todavía no hay ninguna. */
  own?: RatingsResponse["own"];
  onChange: (ratings: RatingsResponse) => void;
}

export function RatingDetailDialog({ open, onClose, target, own, onChange }: RatingDetailDialogProps) {
  const t = useTranslations("catalog.album.relation.detail");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const helpId = useId();
  const sliderId = useId();

  const range = own ? scoreRange(own.stars) : FULL_RANGE;
  const current = own?.detailedScore ?? null;
  // `null` hasta que el usuario elige: el pulgar queda en el centro y no se puede guardar.
  const [value, setValue] = useState<number | null>(current);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const middle = Math.round((range.min + range.max) / 2);
  const clamp = (next: number) => Math.min(range.max, Math.max(range.min, next));
  const step = (delta: number) => setValue((previous) => clamp((previous ?? middle) + delta));
  const shownStars = own ? own.stars : value !== null ? starsFromScore(value) : 0;
  const canSave = value !== null && value !== current;

  // Re Pág / Av Pág no mueven de a 10 en todos los navegadores: se fija aquí.
  function onSliderKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "PageUp" && event.key !== "PageDown") return;
    event.preventDefault();
    step(event.key === "PageUp" ? PAGE_STEP : -PAGE_STEP);
  }

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

  const refresh = async () => onChange(await getRatings(target.type, target.id));

  const save: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canSave || value === null) return;
    void run(async () => {
      await saveRating(target.type, target.id, { detailedScore: value });
      await refresh();
      onClose();
    });
  };

  const toggleHighlight = () => {
    if (!own) return;
    void run(async () => {
      await (own.isHighlighted ? unhighlightRating(own.id) : highlightRating(own.id));
      await refresh();
    });
  };

  const remove = () => {
    setConfirmDelete(false);
    void run(async () => {
      await deleteRating(target.type, target.id);
      await refresh();
      onClose();
    });
  };

  const stepButton =
    "flex size-11 shrink-0 items-center justify-center rounded border border-ink-border font-data text-lg text-paper hover:border-amber disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <>
      <Dialog open={open && !confirmDelete} title={t("title")} onClose={onClose}>
        <form onSubmit={save} className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor={sliderId} className="font-data text-sm text-paper">
              {t("scoreLabel")}
            </label>
            <button
              type="button"
              aria-expanded={helpOpen}
              aria-controls={helpId}
              aria-label={t("helpToggle")}
              title={t("helpToggle")}
              onClick={() => setHelpOpen((previous) => !previous)}
              className="flex size-7 items-center justify-center rounded-full border border-ink-border font-data text-xs text-paper-muted hover:border-amber hover:text-paper aria-expanded:border-amber aria-expanded:text-paper"
            >
              ?
            </button>
          </div>

          {helpOpen && (
            <div id={helpId} className="flex flex-col gap-2 rounded border border-ink-border p-3 font-body text-sm text-paper-muted">
              <p>{t("helpIntro")}</p>
              {!own && <p>{t("helpNoStars")}</p>}
              <table className="w-full font-data text-xs">
                <caption className="sr-only">{t("helpCaption")}</caption>
                <thead>
                  <tr className="text-left">
                    <th scope="col" className="py-1 font-normal">{t("helpStars")}</th>
                    <th scope="col" className="py-1 font-normal">{t("helpPoints")}</th>
                  </tr>
                </thead>
                <tbody>
                  {BANDS.map((stars) => {
                    const band = scoreRange(stars);
                    const isCurrent = own?.stars === stars;
                    return (
                      <tr
                        key={stars}
                        aria-current={isCurrent ? "true" : undefined}
                        className={isCurrent ? "font-medium text-paper" : undefined}
                      >
                        <td className="py-0.5">{formatStars(stars, locale)}★</td>
                        <td className="py-0.5">
                          {band.min}–{band.max}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <StarRatingDisplay
              value={shownStars}
              label={shownStars > 0 ? t("liveStars", { stars: formatStars(shownStars, locale) }) : t("noStarsYet")}
              starClassName="size-6"
            />
            {own && (
              <p className="font-data text-xs text-paper-muted">
                {t("range", { stars: formatStars(own.stars, locale), min: range.min, max: range.max })}
              </p>
            )}
            <p aria-hidden="true" className="font-data text-2xl font-medium text-paper">
              {value !== null ? t("valueScale", { score: value }) : t("valueEmpty")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={t("decrease")}
              disabled={value !== null && value <= range.min}
              onClick={() => step(-1)}
              className={stepButton}
            >
              −
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <input
                id={sliderId}
                type="range"
                min={range.min}
                max={range.max}
                step={1}
                value={value ?? middle}
                aria-valuetext={
                  value !== null
                    ? t("valueText", { score: value, stars: formatStars(starsFromScore(value), locale) })
                    : t("valueTextEmpty")
                }
                onChange={(event) => setValue(Number(event.target.value))}
                // Tocar el pulgar sin moverlo (queda en el centro) no emite `change`: el clic
                // también elige el valor si todavía no había uno.
                onClick={(event) => {
                  if (value === null) setValue(Number(event.currentTarget.value));
                }}
                onKeyDown={onSliderKeyDown}
                // Sin elegir, el pulgar en el centro y la barra ámbar parecerían un valor: se
                // atenúa hasta que el usuario elige (`—/100`).
                data-chosen={value !== null}
                className={`w-full accent-amber transition-opacity ${value === null ? "opacity-40" : ""}`}
              />
              <div aria-hidden="true" className="flex justify-between font-data text-xs text-paper-muted">
                <span>{range.min}</span>
                <span>{range.max}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("increase")}
              disabled={value !== null && value >= range.max}
              onClick={() => step(1)}
              className={stepButton}
            >
              +
            </button>
          </div>
          {own && <p className="-mt-2 font-data text-xs text-paper-muted">{t("rangeHint")}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !canSave}>
              {pending ? t("saving") : t("save")}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
              {t("cancel")}
            </Button>
          </div>
        </form>
        {own && (
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
        )}
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
