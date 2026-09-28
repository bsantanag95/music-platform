"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Línea "También en" de una fila de la alineación (openspec: add-artist-members-tab, design
// D4): las otras bandas de la persona, enlazadas. Colapsada ocupa una sola línea con las 3
// primeras y un "+N"; expandida muestra todas solo en esa fila. Así quien tiene 15 bandas no
// ocupa más que quien tiene 3.

export const ALSO_IN_COLLAPSED = 3;

export interface AlsoInItem {
  artistId: string;
  /** Ya formateado: "Rob Zombie", "ex-Marilyn Manson", "David Lee Roth (apoyo)". */
  label: string;
}

export function LineupAlsoIn({ personName, items, className = "" }: { personName: string; items: AlsoInItem[]; className?: string }) {
  const t = useTranslations("catalog.artist.lineup");
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const rest = items.length - ALSO_IN_COLLAPSED;
  const visible = expanded ? items : items.slice(0, ALSO_IN_COLLAPSED);

  const links = visible.map((item, index) => (
    <span key={item.artistId}>
      {index > 0 ? ", " : null}
      <Link href={`/artist/${item.artistId}`} className="text-paper-muted hover:text-amber hover:underline">
        {item.label}
      </Link>
    </span>
  ));

  return (
    <p className={`flex min-w-0 items-baseline gap-2 font-data text-xs text-paper-muted ${className}`}>
      <span className={`min-w-0 ${expanded ? "" : "truncate"}`}>
        {t("alsoIn")}: {links}
      </span>
      {rest > 0 ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? undefined : t("moreLabel", { count: rest, name: personName })}
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 text-amber hover:underline"
        >
          {expanded ? t("less") : t("more", { count: rest })}
        </button>
      ) : null}
    </p>
  );
}
