"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTimeZone, useTranslations } from "next-intl";
import { useState } from "react";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { Link } from "@/i18n/navigation";
import { createListenEntry, getMyDiaryMonths } from "@/lib/api/diary";
import type { WantToListenEntry } from "@/lib/api/schemas";
import { albumHref, artistHref } from "@/lib/catalog-links";
import { queryKeys } from "@/lib/query/keys";
import { useDiaryBridge } from "./DiaryBridge";

// Nombre local del mes N (1-12), formateado en UTC sobre una fecha sintética
// para que no se corra al mes anterior al oeste de UTC.
function monthName(month: number, locale: string): string {
  const label = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month - 1, 1)),
  );
  return label.replace(/\.$/, "");
}

interface DiaryContextRailProps {
  /** Hasta 4 objetivos de Want to Listen del usuario, del más reciente al más antiguo. */
  toLog: WantToListenEntry[];
  /** Pestaña de diario del perfil propio: lo que ven los demás. */
  profileDiaryHref: string;
}

// Riel del diario propio (openspec: redesign-diary-page, D10), solo desde 1024px.
// Nunca muestra conteos, totales ni rachas (spec `listen-diary`, «Encuadre del
// diario como registro intencional»): «Ir a» lista años y meses sin cifras.
export function DiaryContextRail({ toLog, profileDiaryHref }: DiaryContextRailProps) {
  const t = useTranslations("diary");
  const locale = useLocale();
  const timeZone = useTimeZone() ?? "UTC";
  const bridge = useDiaryBridge();
  const [pending, setPending] = useState(toLog);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logError, setLogError] = useState(false);

  // Misma consulta (y misma caché) que el control de Fecha de la lista.
  const { data } = useQuery({
    queryKey: queryKeys.myDiaryMonths(timeZone),
    queryFn: () => getMyDiaryMonths(timeZone),
    staleTime: 60_000,
  });
  const months = data?.months ?? [];
  const years = Array.from(new Set(months.map((m) => m.year))).sort((a, b) => b - a);
  const active = bridge?.activeDate ?? "";

  // Anotar crea la escucha; el servicio la retira de Want to Listen (la
  // intención ya se cumplió), así que también sale de este módulo.
  const logListen = async (item: WantToListenEntry) => {
    setLoggingId(item.id);
    setLogError(false);
    try {
      const created = await createListenEntry({ type: item.targetType, id: item.target.id });
      setPending((current) => current.filter((candidate) => candidate.id !== item.id));
      bridge?.addEntry(created);
    } catch {
      setLogError(true);
    } finally {
      setLoggingId(null);
    }
  };

  const shortcut = (value: string, label: string, year: string, month: string) => (
    <button
      key={value || "all"}
      type="button"
      aria-pressed={active === value}
      onClick={() => bridge?.setDate(year, month)}
      className={`rounded px-1.5 py-0.5 font-data text-xs transition-colors ${
        active === value ? "bg-amber/10 text-amber" : "text-paper-muted hover:text-paper"
      }`}
    >
      {label}
    </button>
  );

  return (
    <aside aria-label={t("rail.label")} className="flex w-full flex-col gap-4">
      {years.length > 0 && (
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("rail.goTo")}</h2>
          <div className="mt-2">{shortcut("", t("rail.allDiary"), "", "")}</div>
          <ul className="mt-2 flex flex-col gap-2">
            {years.map((year) => (
              <li key={year} className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                {shortcut(String(year), String(year), String(year), "")}
                {months
                  .filter((m) => m.year === year)
                  .sort((a, b) => b.month - a.month)
                  .map((m) =>
                    shortcut(`${year}-${m.month}`, monthName(m.month, locale), String(year), String(m.month)),
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("rail.toLog")}</h2>
          <p className="mt-0.5 font-data text-xs text-paper-muted">{t("rail.toLogHint")}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {pending.map((item) => {
              const href =
                item.targetType === "artist"
                  ? artistHref(item.target.title, item.target.id)
                  : albumHref(item.target.artistName ?? null, item.target.title, item.target.id);
              return (
                <li key={item.id} className="flex items-center gap-3">
                  <CoverThumb
                    cover={item.target.coverThumbUrl}
                    label=""
                    className={`size-10 shrink-0 ${item.targetType === "artist" ? "!rounded-full" : ""}`}
                  />
                  <span className="min-w-0 flex-1">
                    <Link
                      href={href}
                      className="block truncate font-display text-sm text-paper transition-colors hover:text-amber"
                    >
                      {item.target.title}
                    </Link>
                    {item.target.artistName ? (
                      <span className="block truncate font-data text-xs text-paper-muted">{item.target.artistName}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    disabled={loggingId !== null}
                    onClick={() => void logListen(item)}
                    aria-label={t("rail.logItem", { title: item.target.title })}
                    className="shrink-0 rounded border border-ink-border px-2.5 py-1 font-data text-xs text-paper transition-colors hover:border-amber disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loggingId === item.id ? t("listening") : t("rail.log")}
                  </button>
                </li>
              );
            })}
          </ul>
          {logError && (
            <p role="alert" className="mt-2 font-data text-xs text-danger">
              {t("saveError")}
            </p>
          )}
          <Link
            href="/me/want-to-listen"
            className="mt-3 inline-block font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("rail.seeWanted")} →
          </Link>
        </section>
      )}

      <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
        <h2 className="font-display text-base text-paper">{t("rail.asOthers")}</h2>
        <p className="mt-1 font-body text-sm text-paper-muted">{t("rail.asOthersDescription")}</p>
        <Link
          href={profileDiaryHref}
          className="mt-3 inline-block font-data text-xs text-paper-muted transition-colors hover:text-paper"
        >
          {t("rail.asOthersLink")} →
        </Link>
      </section>
    </aside>
  );
}
