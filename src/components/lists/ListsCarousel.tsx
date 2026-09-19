"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HorizontalRail } from "@/components/ui/HorizontalRail";
import type { UserListSummary } from "@/lib/api/schemas";
import { ProfileListCard } from "./ProfileListCard";

interface ListsCarouselProps {
  /** Las primeras listas del perfil (fijadas primero), ya acotadas por el llamador. */
  lists: UserListSummary[];
  username: string;
  /** Total real de listas visibles; si supera `lists.length`, el riel cierra con la puerta. */
  totalCount: number;
}

// Estante "Listas" del perfil (Nivel 2): un riel horizontal con las tarjetas de
// lista de siempre (elegido entre mockups: no se rediseñó la tarjeta, solo se
// la pone a deslizar), con el tope que aplica el llamador. Si hay más de las
// que caben, el riel termina en una tarjeta-puerta "+N · Ver las N listas" que
// lleva a la página dedicada `/users/[username]/lists` — la lista completa, con
// buscador, de solo lectura.
export function ListsCarousel({ lists, username, totalCount }: ListsCarouselProps) {
  const t = useTranslations("lists");
  const remaining = totalCount - lists.length;

  return (
    <HorizontalRail label={t("railLabel")} prevLabel={t("railPrev")} nextLabel={t("railNext")}>
      {lists.map((list) => (
        <li key={list.id} className="flex w-80 shrink-0 snap-start">
          <ProfileListCard list={list} username={username} className="w-full" />
        </li>
      ))}
      {remaining > 0 && (
        <li className="flex shrink-0 snap-start">
          <Link
            href={`/users/${encodeURIComponent(username)}/lists`}
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
