"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RelativeDate } from "@/components/feed/feed-row-parts";
import { albumHref } from "@/lib/catalog-links";
import type { NextUpAlbum } from "@/lib/api/schemas";

// Línea de detalle de una fila de /me/progress (openspec: redesign-progress-views, D2): qué disco sigue —un enlace al
// álbum— y cuándo fue la última escucha de la selección. Reemplaza "Actualizado hace…", que no cambiaba al escuchar. Una
// selección completa no propone siguiente; una vacía lo dice. Nunca cuenta cuántos discos faltan (§6.4.1).
export function ProgressRowMeta({
  nextUp,
  lastListenedAt,
  selectedCount,
  complete,
  emptyLabel,
}: {
  nextUp: NextUpAlbum | null;
  lastListenedAt: string | null;
  selectedCount: number;
  complete: boolean;
  /** Texto para una selección vacía; cada pestaña dice cómo se llena. */
  emptyLabel: string;
}) {
  const t = useTranslations("camino");

  if (selectedCount === 0) {
    return <span className="font-data text-[0.65rem] text-paper-muted">{emptyLabel}</span>;
  }

  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 font-data text-[0.65rem] text-paper-muted">
      {!complete && nextUp ? (
        <span className="min-w-0 truncate">
          {t("nextUp")}{" "}
          <Link
            href={albumHref(nextUp.artistName, nextUp.title, nextUp.id)}
            className="text-paper underline decoration-dotted underline-offset-2 transition-colors hover:text-amber"
          >
            {nextUp.title}
          </Link>
          {nextUp.year ? ` (${nextUp.year})` : null}
        </span>
      ) : null}
      <span className="shrink-0">
        {lastListenedAt ? (
          <>
            {t("lastListened")} <RelativeDate iso={lastListenedAt} />
          </>
        ) : (
          t("noListensYet")
        )}
      </span>
    </span>
  );
}
