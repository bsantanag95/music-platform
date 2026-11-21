"use client";

import { type KeyboardEvent, useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ReleaseTimetable } from "@/components/discovery/ReleaseTimetable";
import type { HomeRelease } from "@/services/home/home";

type TabKey = "personal" | "popular";

// Lanzamientos del Inicio con sesión: el horario de la portada (openspec: redesign-anon-home-phase3) con el
// selector "De tus artistas | Populares" (add-home-release-calendar; como horario desde
// redesign-signed-in-home-phase3). Son dos vistas con orientación propia —lo de la música de la persona y lo
// popular del momento— que nunca se mezclan. Cliente por la pestaña activa; los textos salen de
// `useTranslations` porque las etiquetas del horario incluyen una función (no cruzan del servidor).
export function ReleaseSwitcher({
  personal,
  popular,
  defaultTab,
  showHint,
}: {
  personal: HomeRelease[];
  popular: HomeRelease[];
  defaultTab: TabKey;
  /** La persona tiene pocos discos propios: se invita a seguir artistas. */
  showHint: boolean;
}) {
  const t = useTranslations("home");
  const locale = useLocale();
  const baseId = useId();
  const headingId = `${baseId}-releases`;
  // "Populares" se oculta si no hay nada que mostrar; "De tus artistas" siempre está (vacía, invita).
  const tabs: TabKey[] = popular.length > 0 ? ["personal", "popular"] : ["personal"];
  const [active, setActive] = useState<TabKey>(tabs.includes(defaultTab) ? defaultTab : "personal");
  const tabLabels: Record<TabKey, string> = { personal: t("releasesTabPersonal"), popular: t("releasesTabPopular") };

  const onKeyDown = (e: KeyboardEvent) => {
    if (tabs.length < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const next = active === "personal" ? "popular" : "personal";
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const releases = active === "personal" ? personal : popular;
  const showInvite = showHint || (active === "personal" && personal.length === 0);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading id={headingId} title={t("releasesTitle")} description={t("releasesDescriptionSignedIn")} />
        {tabs.length > 1 ? (
          <div
            role="tablist"
            aria-label={t("releasesTabsLabel")}
            className="inline-flex w-fit shrink-0 gap-1 rounded-md border border-ink-border bg-ink-surface p-1"
            onKeyDown={onKeyDown}
          >
            {tabs.map((key) => {
              const selected = key === active;
              return (
                <button
                  key={key}
                  id={`${baseId}-tab-${key}`}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(key)}
                  className={`min-h-9 rounded px-3 py-1.5 font-data text-xs transition-colors duration-150 ${
                    selected ? "bg-ink text-amber shadow-sm shadow-black/40" : "text-paper-muted hover:text-paper"
                  }`}
                >
                  {tabLabels[key]}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div id={`${baseId}-panel`} role={tabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={tabs.length > 1 ? `${baseId}-tab-${active}` : undefined}>
        {releases.length > 0 ? (
          <ReleaseTimetable
            key={active}
            releases={releases}
            locale={locale}
            labelledBy={`${headingId}-${active}`}
            labels={{
              recent: t("releasesRecent"),
              upcoming: t("releasesUpcoming"),
              published: t("releasesPublishedBadge"),
              upcomingBadge: t("releasesUpcomingBadge"),
              showMore: (count) => t("releasesShowMore", { count }),
              showLess: t("releasesShowLess"),
            }}
          />
        ) : null}
        {showInvite ? (
          <p data-release-hint="" className={`font-body text-base text-paper-muted ${releases.length > 0 ? "mt-6" : ""}`}>
            {t("releasesFollowHint")}{" "}
            <Link href="/search" className="text-amber hover:text-amber-hover hover:underline">
              {t("releasesFollowCta")}
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
