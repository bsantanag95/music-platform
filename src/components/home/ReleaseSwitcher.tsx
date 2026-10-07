"use client";

import { type ComponentProps, type KeyboardEvent, useId, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ReleaseRail } from "./ReleaseRail";
import type { HomeRelease } from "@/services/home/home";

type TabKey = "personal" | "popular";

type RailProps = Omit<ComponentProps<typeof ReleaseRail>, "releases" | "headerAction" | "footer">;

// Selector "De tus artistas | Populares" del riel de lanzamientos de Inicio con sesión (openspec:
// add-home-release-calendar). Son dos vistas con orientación propia —lo de la música de la persona y
// lo popular del momento— que nunca se mezclan. Client component por la pestaña activa; el riel se
// remonta al cambiar para reposicionar el marcador "hoy".
export function ReleaseSwitcher({
  personal,
  popular,
  defaultTab,
  showHint,
  railProps,
  tabLabels,
  tablistLabel,
  hint,
  hintCta,
}: {
  personal: HomeRelease[];
  popular: HomeRelease[];
  defaultTab: TabKey;
  /** La persona tiene pocos discos propios: se invita a seguir artistas. */
  showHint: boolean;
  railProps: RailProps;
  tabLabels: Record<TabKey, string>;
  tablistLabel: string;
  hint: string;
  hintCta: string;
}) {
  const baseId = useId();
  // "Populares" se oculta si no hay nada que mostrar; "De tus artistas" siempre está (vacía, invita).
  const tabs: TabKey[] = popular.length > 0 ? ["personal", "popular"] : ["personal"];
  const [active, setActive] = useState<TabKey>(tabs.includes(defaultTab) ? defaultTab : "personal");

  const onKeyDown = (e: KeyboardEvent) => {
    if (tabs.length < 2 || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
    e.preventDefault();
    const next = active === "personal" ? "popular" : "personal";
    setActive(next);
    document.getElementById(`${baseId}-tab-${next}`)?.focus();
  };

  const tablist =
    tabs.length > 1 ? (
      <div
        role="tablist"
        aria-label={tablistLabel}
        className="inline-flex w-fit gap-1 rounded-md border border-ink-border bg-ink-surface p-1"
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
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(key)}
              className={`rounded px-3 py-1.5 font-data text-xs transition-colors duration-150 ${
                selected ? "bg-ink text-amber shadow-sm shadow-black/40" : "text-paper-muted hover:text-paper"
              }`}
            >
              {tabLabels[key]}
            </button>
          );
        })}
      </div>
    ) : null;

  const hintNode =
    showHint || (active === "personal" && personal.length === 0) ? (
      <p data-release-hint="" className="font-body text-sm text-paper-muted">
        {hint}{" "}
        <Link href="/search" className="text-amber hover:text-amber-hover hover:underline">
          {hintCta}
        </Link>
      </p>
    ) : null;

  const releases = active === "personal" ? personal : popular;

  if (releases.length === 0) {
    return (
      <section className="flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className="font-display text-xl text-paper">{railProps.title}</h2>
          {tablist}
        </div>
        {hintNode}
      </section>
    );
  }

  return (
    <ReleaseRail
      key={active}
      {...railProps}
      releases={releases}
      headerAction={tablist}
      footer={hintNode}
    />
  );
}
