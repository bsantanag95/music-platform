"use client";

import { useEffect, useId, useRef, useState } from "react";
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
import { isScoreCoherent } from "@/lib/rating-range";
import type { PickTarget } from "../types";

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
export function RatePanel({ target, onReset, onNavigate }: RatePanelProps) {
  const t = useTranslations("quickActions");
  const locale = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [scoreText, setScoreText] = useState("");
  const [scoreInvalid, setScoreInvalid] = useState(false);
  const [savedStars, setSavedStars] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);
  const scoreId = useId();

  useEffect(() => {
    let cancelled = false;
    getTargetMarks(target.type, target.id)
      .then((marks) => {
        if (cancelled) return;
        setStars(marks.stars);
        setScore(marks.detailedScore);
        setScoreText(marks.detailedScore === null ? "" : String(marks.detailedScore));
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
      if (current !== seq.current) return;
      setSavedStars(value);
      if (score !== null && !keepScore) {
        setNotice(t("rate.scoreDropped", { score, stars: formatStars(value, locale) }));
        setScore(null);
        setScoreText("");
      }
    } catch (err) {
      if (current !== seq.current) return;
      setStars(previous);
      setErrorCode(err instanceof ApiError ? err.code : "INTERNAL_ERROR");
    } finally {
      if (current === seq.current) setBusy(false);
    }
  }

  // Puntuar con el número (D6): se envía solo `detailedScore` y el servidor deriva las estrellas
  // (`starsFromScore`), así nunca viaja una combinación incoherente. Se relee para mostrar las
  // estrellas derivadas. Un campo vacío o igual al vigente no hace nada (Enter y blur disparan esto).
  async function commitScore() {
    const text = scoreText.trim();
    if (text === (score === null ? "" : String(score))) {
      setScoreInvalid(false);
      return;
    }
    const value = Number(text);
    if (!/^\d+$/.test(text) || value < 1 || value > 100) {
      setScoreInvalid(true);
      return;
    }
    const current = ++seq.current;
    setScoreInvalid(false);
    setBusy(true);
    setNotice(null);
    setErrorCode(null);
    try {
      await saveRating(target.type, target.id, { detailedScore: value });
      const marks = await getTargetMarks(target.type, target.id);
      if (current !== seq.current) return;
      setStars(marks.stars);
      setScore(marks.detailedScore);
      setScoreText(marks.detailedScore === null ? "" : String(marks.detailedScore));
      setSavedStars(marks.stars);
    } catch (err) {
      if (current !== seq.current) return;
      setScoreText(score === null ? "" : String(score));
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
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void commitScore();
        }}
        className="flex flex-col gap-1"
        noValidate
      >
        <label htmlFor={scoreId} className="font-data text-xs text-paper-muted">
          {t("rate.scoreLabel")}
        </label>
        <input
          id={scoreId}
          type="text"
          inputMode="numeric"
          value={scoreText}
          disabled={busy}
          maxLength={3}
          aria-invalid={scoreInvalid}
          aria-describedby={scoreInvalid ? `${scoreId}-error` : undefined}
          onChange={(e) => {
            setScoreText(e.target.value);
            setScoreInvalid(false);
          }}
          onBlur={() => void commitScore()}
          className={`w-24 rounded border bg-ink px-3 py-2 font-data text-sm text-paper ${
            scoreInvalid ? "border-danger" : "border-ink-border"
          }`}
        />
        {scoreInvalid ? (
          <span id={`${scoreId}-error`} role="alert" className="font-data text-xs text-danger">
            {t("rate.scoreInvalid")}
          </span>
        ) : null}
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
      {savedStars !== null && !errorCode ? (
        <p role="status" className="font-data text-xs text-paper">
          {t("rate.saved", { stars: formatStars(savedStars, locale), title: target.title })}
        </p>
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
