"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { useRouter } from "@/i18n/navigation";
import { clearYearTop, hideYearDisc, saveYearTop, showYearDisc } from "@/lib/api/year";
import { scaleScore } from "@/lib/share/score-scale";

// Curaduría de "Tu año en discos" para su dueño (spec year-laminas, openspec: add-year-in-discs-phase2): cambiar y ordenar el Top 5, ocultar un disco del
// año y volver a mostrar los ocultos. Cada acción guarda al toque y refresca la página: lo que se ve sale siempre del servidor. Las notas solo aparecen
// acá, para elegir; nunca en lo que ven los demás.

const TOP_SIZE = 5;
const iconButton =
  "grid size-9 place-items-center rounded border border-ink-border font-data text-sm text-paper-muted transition-colors hover:text-paper disabled:opacity-40 [@media(pointer:coarse)]:size-11";

interface Disc {
  id: string;
  title: string;
  artistName: string | null;
  coverThumbUrl: string | null;
}

interface Choice extends Disc {
  listens: number;
  score: { stars: number; detailedScore: number | null } | null;
}

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return { busy, failed, run };
}

export function YearTopEditor({ year, top, custom, choices }: { year: number; top: Disc[]; custom: boolean; choices: Choice[] }) {
  const t = useTranslations("laminas.year.edit");
  const { busy, failed, run } = useAction();
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<string[]>(top.map((disc) => disc.id));
  const ids = top.map((disc) => disc.id);

  function move(index: number, delta: -1 | 1) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta]!, next[index]!];
    void run(() => saveYearTop(year, next));
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : current.length < TOP_SIZE ? [...current, id] : current));
  }

  return (
    <div className="flex flex-col gap-3">
      {top.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {top.map((disc, index) => (
            <li key={disc.id} className="flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-2">
              <span className={`w-6 text-center font-data text-sm ${index === 0 ? "text-amber" : "text-paper-muted"}`}>{index + 1}</span>
              <CoverThumb cover={disc.coverThumbUrl} label="" className="size-12 shrink-0 rounded" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-display text-sm text-paper">{disc.title}</span>
                {disc.artistName ? <span className="truncate font-data text-xs text-paper-muted">{disc.artistName}</span> : null}
              </span>
              <button type="button" className={iconButton} disabled={busy || index === 0} aria-label={t("moveUp", { title: disc.title })} onClick={() => move(index, -1)}>
                ↑
              </button>
              <button
                type="button"
                className={iconButton}
                disabled={busy || index === top.length - 1}
                aria-label={t("moveDown", { title: disc.title })}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="font-data text-xs text-paper-muted">{custom ? t("custom") : t("prefilled")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setSelected(ids);
            setPicking((open) => !open);
          }}
          aria-expanded={picking}
          className="min-h-9 rounded border border-ink-border px-3 py-1.5 font-display text-sm text-paper transition-colors hover:border-amber hover:text-amber"
        >
          {t("change")}
        </button>
        {custom ? (
          <button type="button" disabled={busy} onClick={() => void run(() => clearYearTop(year))} className="min-h-9 font-data text-xs text-paper-muted hover:text-paper">
            {t("reset")}
          </button>
        ) : null}
      </div>
      {picking ? (
        <fieldset className="flex flex-col gap-2 rounded border border-ink-border bg-ink-surface p-3">
          <legend className="px-1 font-data text-xs text-paper-muted">{t("pickLegend", { count: selected.length, max: TOP_SIZE })}</legend>
          <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
            {choices.map((choice) => {
              const checked = selected.includes(choice.id);
              const score = choice.score ? scaleScore(choice.score).label : null;
              return (
                <li key={choice.id}>
                  <label className="flex min-h-11 items-center gap-3 rounded px-2 py-1 hover:bg-ink">
                    <input type="checkbox" checked={checked} disabled={!checked && selected.length >= TOP_SIZE} onChange={() => toggle(choice.id)} className="form-check" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-display text-sm text-paper">{choice.title}</span>
                      <span className="truncate font-data text-xs text-paper-muted">
                        {[choice.artistName, t("listens", { count: choice.listens }), score].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || selected.length === 0}
              onClick={() =>
                void run(async () => {
                  await saveYearTop(year, selected);
                  setPicking(false);
                })
              }
              className="rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover disabled:opacity-50"
            >
              {t("save")}
            </button>
            <button type="button" onClick={() => setPicking(false)} className="min-h-9 font-data text-xs text-paper-muted hover:text-paper">
              {t("cancel")}
            </button>
          </div>
        </fieldset>
      ) : null}
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
}

/** "Ocultar del año" en un disco del calendario: deja de contar en todo para los demás. */
export function YearHideButton({ year, disc }: { year: number; disc: Disc }) {
  const t = useTranslations("laminas.year.edit");
  const { busy, failed, run } = useAction();
  return (
    <>
      <button
        type="button"
        disabled={busy}
        aria-label={t("hide", { title: disc.title })}
        title={t("hide", { title: disc.title })}
        onClick={() => void run(() => hideYearDisc(year, disc.id))}
        className="absolute -right-1.5 -top-1.5 grid size-7 place-items-center rounded-full border border-ink-border bg-ink font-data text-xs text-paper-muted transition-colors hover:text-paper disabled:opacity-40 [@media(pointer:coarse)]:size-9"
      >
        ×
      </button>
      {failed ? (
        <span role="alert" className="sr-only">
          {t("failed")}
        </span>
      ) : null}
    </>
  );
}

/** Los ocultos del año, para volver a mostrarlos. Nadie más sabe que existen. */
export function YearHiddenList({ year, hidden }: { year: number; hidden: Disc[] }) {
  const t = useTranslations("laminas.year.edit");
  const { busy, failed, run } = useAction();
  if (hidden.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 rounded border border-dashed border-ink-border p-3">
      <h2 className="font-display text-sm text-paper">{t("hiddenTitle", { count: hidden.length })}</h2>
      <p className="font-data text-xs text-paper-muted">{t("hiddenHint")}</p>
      <ul className="flex flex-col gap-1">
        {hidden.map((disc) => (
          <li key={disc.id} className="flex items-center gap-3">
            <CoverThumb cover={disc.coverThumbUrl} label="" className="size-10 shrink-0 rounded" />
            <span className="min-w-0 flex-1 truncate font-display text-sm text-paper">{disc.title}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(() => showYearDisc(year, disc.id))}
              className="min-h-9 font-data text-xs text-amber underline-offset-2 hover:underline [@media(pointer:coarse)]:min-h-11"
            >
              {t("show")}
            </button>
          </li>
        ))}
      </ul>
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("failed")}
        </p>
      ) : null}
    </section>
  );
}
