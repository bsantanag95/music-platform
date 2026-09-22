"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HorizontalRail } from "@/components/ui/HorizontalRail";
import type { CaminoProfileSummary } from "@/lib/api/schemas";
import { CaminoProfileCard } from "./CaminoProfileCard";

interface CaminosCarouselProps {
  /** Los primeros Caminos del perfil, ya acotados por el llamador. */
  caminos: CaminoProfileSummary[];
  username: string;
  /** Total real de Caminos visibles; si supera `caminos.length`, cierra con la puerta. */
  totalCount: number;
  /** `false` en el propio perfil del dueño — no se puede trackear el propio Camino. */
  canTrack?: boolean;
}

// Estante "Camino" del perfil (Nivel 2) — mismo mecanismo que el riel de
// Listas (`ListsCarousel`), sobre Caminos en vez de Listas: riel horizontal +
// tarjeta-puerta "+N" a la página dedicada `/users/[username]/caminos`.
export function CaminosCarousel({ caminos, username, totalCount, canTrack = true }: CaminosCarouselProps) {
  const t = useTranslations("camino");
  const remaining = totalCount - caminos.length;

  return (
    <HorizontalRail label={t("railLabel")} prevLabel={t("railPrev")} nextLabel={t("railNext")}>
      {caminos.map((camino) => (
        <li key={camino.id} className="flex w-80 shrink-0 snap-start">
          <CaminoProfileCard camino={camino} username={username} canTrack={canTrack} className="w-full" />
        </li>
      ))}
      {remaining > 0 && (
        <li className="flex shrink-0 snap-start">
          <Link
            href={`/users/${encodeURIComponent(username)}/caminos`}
            className="flex w-48 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink-border px-3 text-center font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper"
          >
            <span className="font-display text-2xl text-paper">+{remaining}</span>
            <span>{t("profileSeeAll", { count: totalCount })}</span>
          </Link>
        </li>
      )}
    </HorizontalRail>
  );
}
