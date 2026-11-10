"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { saveDiscographyPreference } from "@/lib/api/laminas";
import type { DiscographyExtraSection, DiscographyView } from "@/lib/laminas/discography";

// Ajustes del dueño en su discografía (spec discography-laminas, "Preferencias del dueño"): qué secciones suma y qué vista se
// muestra por defecto. La imagen compartida muestra lo mismo; se guarda aunque no esté compartida.

const SECTIONS: DiscographyExtraSection[] = ["live", "compilations"];
const VIEWS: DiscographyView[] = ["disc", "song"];

export function DiscographySettings({
  artistId,
  initial,
}: {
  artistId: string;
  initial: { sections: DiscographyExtraSection[]; view: DiscographyView };
}) {
  const t = useTranslations("laminas.discography.settings");
  const tViews = useTranslations("laminas.discography.views");
  const router = useRouter();
  const [sections, setSections] = useState(initial.sections);
  const [view, setView] = useState(initial.view);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  async function save() {
    setState("saving");
    try {
      await saveDiscographyPreference(artistId, { sections, view });
      setState("saved");
      router.refresh();
    } catch {
      setState("failed");
    }
  }

  return (
    <details className="rounded border border-ink-border bg-ink-surface p-3">
      <summary className="cursor-pointer font-display text-sm text-paper">{t("title")}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-data text-xs text-paper-muted">{t("sections")}</legend>
          {SECTIONS.map((section) => (
            <label key={section} className="flex min-h-9 items-center gap-2 font-body text-sm text-paper">
              <input
                type="checkbox"
                checked={sections.includes(section)}
                onChange={(event) => {
                  setState("idle");
                  setSections((current) => (event.target.checked ? [...current, section] : current.filter((item) => item !== section)));
                }}
                className="form-check"
              />
              {t(`section.${section}`)}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="font-data text-xs text-paper-muted">{t("defaultView")}</legend>
          {VIEWS.map((option) => (
            <label key={option} className="flex min-h-9 items-center gap-2 font-body text-sm text-paper">
              <input
                type="radio"
                name="discography-view"
                checked={view === option}
                onChange={() => {
                  setState("idle");
                  setView(option);
                }}
                className="size-4"
              />
              {tViews(option)}
            </label>
          ))}
        </fieldset>
        <p className="font-data text-xs text-paper-muted">{t("hint")}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={state === "saving"}
            onClick={() => void save()}
            className="rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-50"
          >
            {t("save")}
          </button>
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
      </div>
    </details>
  );
}
