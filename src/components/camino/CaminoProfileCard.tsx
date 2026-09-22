"use client";

import { useTranslations } from "next-intl";
import { ListCard } from "@/components/lists/ListCard";
import { TrackListButton } from "./TrackListButton";
import type { CaminoProfileSummary } from "@/lib/api/schemas";

// Tarjeta de un Camino en el perfil de OTRA persona (riel del Nivel 2 y
// página dedicada): mismo `ListCard` genérico que usan las Listas, con la
// acción de tracking (no Guardar/Seguir — un Camino se trackea, no se
// guarda como una Lista) y el estado/progreso propio del dueño como meta.
export function CaminoProfileCard({
  camino,
  username,
  canTrack = true,
  className,
}: {
  camino: CaminoProfileSummary;
  username: string;
  /** `false` en el propio perfil del dueño — no se puede trackear el propio Camino. */
  canTrack?: boolean;
  className?: string;
}) {
  const t = useTranslations("camino");

  return (
    <ListCard
      href={`/users/${encodeURIComponent(username)}/caminos/${camino.id}`}
      title={camino.title}
      coverThumbs={camino.coverThumbs}
      className={className}
      meta={
        <>
          <span>{t("itemsCount", { count: camino.itemCount })}</span>
          {camino.progress.selectedCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{camino.state === "complete" ? t("stateComplete") : t("stateInProgress")}</span>
            </>
          )}
        </>
      }
      action={
        canTrack ? (
          <TrackListButton
            key={`${camino.id}:${camino.tracking}`}
            listId={camino.id}
            initialTracking={camino.tracking}
            initialProgress={null}
          />
        ) : null
      }
    />
  );
}
