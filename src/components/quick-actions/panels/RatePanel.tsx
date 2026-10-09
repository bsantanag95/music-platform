"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { formatStars } from "@/components/album/album-format";
import { getTargetMarks } from "@/lib/api/marks";
import { saveRating } from "@/lib/api/social";
import { ApiError } from "@/lib/api/client";
import { albumHref, artistHref, songHref } from "@/lib/catalog-links";
import { isScoreCoherent, scoreRange, starsFromScore } from "@/lib/rating-range";
import { useNotifyQuickActionChange } from "../quick-actions-changes";
import type { PickTarget } from "../types";
import { ActionNotice } from "../ActionNotice";

const FULL_RANGE = { min: 1, max: 100 };
const PAGE_STEP = 10;

interface RatePanelProps {
  target: PickTarget;
  onReset: () => void;
  onNavigate: () => void;
}

function targetHref(target: PickTarget): string {
  if (target.type === "artist") return artistHref(target.title, target.id);
  if (target.type === "release-group") return albumHref(target.subtitle, target.title, target.id);
  return songHref(target.subtitle, target.title, target.id);
}

// Acción Valorar del diálogo de acciones rápidas (openspec: add-header-quick-actions, D6): pide
// las marcas para precargar las estrellas y guarda al tocar. Conserva el puntaje detallado si
// sigue siendo coherente con las nuevas estrellas; si no, lo suelta y avisa (el `CHECK` de
// `rating` rechazaría la combinación). Replica `AlbumRelationPanel.rate` sin refactorizarlo.
const stepButton =
  "flex size-9 shrink-0 items-center justify-center rounded border border-ink-border font-data text-lg text-paper hover:border-amber disabled:cursor-not-allowed disabled:opacity-40";

export function RatePanel({ target, onReset, onNavigate }: RatePanelProps) {
  const t = useTranslations("quickActions");
  const tDetail = useTranslations("catalog.album.relation.detail");
  const locale = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  // `null` hasta que se elige: el pulgar queda en el centro y no se puede guardar (como en `RatingDetailDialog`).
  const [value, setValue] = useState<number | null>(null);
  const [savedStars, setSavedStars] = useState<number | null>(null);
  const [savedScore, setSavedScore] = useState<number | null>(null);
  // Cuenta de guardados: remonta el aviso para que la confirmación se vea en cada guardado.
  const [saves, setSaves] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const scoreId = useId();
  const notifyChanged = useNotifyQuickActionChange();

  useEffect(() => {
    let cancelled = false;
    getTargetMarks(target.type, target.id)
      .then((marks) => {
        if (cancelled) return;
        setStars(marks.stars);
        setScore(marks.detailedScore);
        setValue(marks.detailedScore);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [target.type, target.id]);

  async function rate(value: number) {
    const current = ++seq.current;
    const previous = stars;
    const keepScore = score !== null && isScoreCoherent(value, score);
    setStars(value);
    setBusy(true);
    setNotice(null);
    setErrorCode(null);
    try {
      await saveRating(target.type, target.id, { stars: value, ...(keepScore ? { detailedScore: score } : {}) });
      notifyChanged();
      if (current !== seq.current) return;
      setSavedStars(value);
      setSavedScore(keepScore ? score : null);
      setSaves((n) => n + 1);
      if (score !== null && !keepScore) {
        setNotice(t("rate.scoreDropped", { score, stars: formatStars(value, locale) }));
        setScore(null);
        setValue(null);
      }
    } catch (err) {
      if (current !== seq.current) return;
      setStars(previous);
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      if (current === seq.current) setBusy(false);
    }
  }

  // Puntuar con el deslizador (D6): se envía solo `detailedScore` y el servidor deriva las estrellas
  // (`starsFromScore`), así nunca viaja una combinación incoherente. Con estrellas el rango se limita a
  // su tramo (4★ → 71–80), igual que `RatingDetailDialog`. Se relee para mostrar lo que quedó guardado.
  const range = stars !== null ? scoreRange(stars) : FULL_RANGE;
  const middle = Math.round((range.min + range.max) / 2);
  const clamp = (next: number) => Math.min(range.max, Math.max(range.min, next));
  const step = (delta: number) => setValue((previous) => clamp((previous ?? middle) + delta));
  const canSave = value !== null && value !== score && !busy;

  // Re Pág / Av Pág no mueven de a 10 en todos los navegadores: se fija aquí.
  function onSliderKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "PageUp" && event.key !== "PageDown") return;
    event.preventDefault();
    step(event.key === "PageUp" ? PAGE_STEP : -PAGE_STEP);
  }

  async function saveScore() {
    if (value === null || value === score) return;
    const current = ++seq.current;
    setBusy(true);
    setNotice(null);
    setErrorCode(null);
    try {
      await saveRating(target.type, target.id, { detailedScore: value });
      notifyChanged();
      const marks = await getTargetMarks(target.type, target.id);
      if (current !== seq.current) return;
      setStars(marks.stars);
      setScore(marks.detailedScore);
      setValue(marks.detailedScore);
      setSavedStars(marks.stars);
      setSavedScore(marks.detailedScore);
      setSaves((n) => n + 1);
    } catch (err) {
      if (current !== seq.current) return;
      setValue(score);
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      if (current === seq.current) setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <span className="flex items-center gap-2 font-data text-xs text-paper-muted">
        <Spinner label={t("rate.loading")} className="size-4" /> {t("rate.loading")}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="truncate font-display text-sm text-paper">{target.title}</p>
      <StarRatingInput
        value={stars}
        onChange={(value) => void rate(value)}
        legend={t("rate.legend", { title: target.title })}
        valueLabel={(value) => t("rate.starsValue", { stars: formatStars(value, locale) })}
        disabled={busy}
      />
      {savedStars !== null && !errorCode ? (
        <ActionNotice
          key={saves}
          tone="success"
          title={t("rate.saved")}
          detail={`★ ${savedScore !== null ? `${savedScore}/100` : formatStars(savedStars, locale)} · ${target.title}`}
        />
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveScore();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={scoreId} className="font-data text-xs text-paper-muted">
            {tDetail("scoreLabel")}
          </label>
          <span aria-hidden="true" className="font-data text-lg font-medium text-paper">
            {value !== null ? tDetail("valueScale", { score: value }) : tDetail("valueEmpty")}
          </span>
        </div>
        {stars !== null ? (
          <p className="font-data text-xs text-paper-muted">
            {tDetail("range", { stars: formatStars(stars, locale), min: range.min, max: range.max })}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={tDetail("decrease")}
            disabled={busy || (value !== null && value <= range.min)}
            onClick={() => step(-1)}
            className={stepButton}
          >
            −
          </button>
          <input
            id={scoreId}
            type="range"
            min={range.min}
            max={range.max}
            step={1}
            value={value ?? middle}
            disabled={busy}
            aria-valuetext={
              value !== null
                ? tDetail("valueText", { score: value, stars: formatStars(starsFromScore(value), locale) })
                : tDetail("valueTextEmpty")
            }
            onChange={(event) => setValue(Number(event.target.value))}
            // Tocar el pulgar sin moverlo (queda en el centro) no emite `change`: el clic también elige.
            onClick={(event) => {
              if (value === null) setValue(Number(event.currentTarget.value));
            }}
            onKeyDown={onSliderKeyDown}
            className={`min-w-0 flex-1 accent-amber transition-opacity ${value === null ? "opacity-40" : ""}`}
          />
          <button
            type="button"
            aria-label={tDetail("increase")}
            disabled={busy || (value !== null && value >= range.max)}
            onClick={() => step(1)}
            className={stepButton}
          >
            +
          </button>
        </div>
        <div>
          <Button type="submit" variant="secondary" disabled={!canSave}>
            {busy ? tDetail("saving") : tDetail("save")}
          </Button>
        </div>
      </form>
      {errorCode === "AUTH_REQUIRED" ? (
        <Link href="/auth/login" className="font-data text-sm text-amber underline">
          {t("signIn")}
        </Link>
      ) : errorCode ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("saveError")}
        </span>
      ) : null}
      {notice ? (
        <p role="status" className="font-data text-xs text-paper-muted">
          {notice}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 border-t border-ink-border pt-3">
        <Button variant="secondary" onClick={onReset}>
          {t("chooseAnother")}
        </Button>
        <Link
          href={targetHref(target)}
          onClick={onNavigate}
          className="font-data text-xs text-paper-muted underline decoration-dotted transition-colors hover:text-paper"
        >
          {t("rate.openPage")}
        </Link>
      </div>
    </div>
  );
}
