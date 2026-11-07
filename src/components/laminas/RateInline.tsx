"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { StarRatingInput } from "@/components/social/StarRatingInput";
import { saveRating } from "@/lib/api/social";

// Estrellas para valorar desde la discografía propia (spec discography-laminas, "Valora lo que falta"): el mismo control y la misma
// API que el panel del álbum. Cada elección se guarda al instante; un fallo no pierde las demás.

export function RateInline({ target, id, title }: { target: "release-group" | "recording"; id: string; title: string }) {
  const t = useTranslations("laminas.discography.rate");
  const [value, setValue] = useState<number | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function choose(stars: number) {
    const previous = value;
    setValue(stars);
    setState("saving");
    try {
      await saveRating(target, id, { stars });
      setState("saved");
    } catch {
      setValue(previous);
      setState("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StarRatingInput
        value={value}
        onChange={(stars) => void choose(stars)}
        legend={t("legend", { title })}
        valueLabel={(stars) => t("value", { value: stars })}
        disabled={state === "saving"}
        size="sm"
      />
      {state === "saved" ? (
        <span role="status" className="font-data text-xs text-paper-muted">
          {t("saved")}
        </span>
      ) : null}
      {state === "failed" ? (
        <span role="alert" className="font-data text-xs text-danger">
          {t("failed")}
        </span>
      ) : null}
    </div>
  );
}
