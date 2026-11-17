"use client";

import { useTranslations } from "next-intl";
import { ListCard } from "@/components/lists/ListCard";
import { TrackListButton } from "./TrackListButton";
import type { CaminoProfileSummary } from "@/lib/api/schemas";
import { AudienceMark } from "@/components/profiles/AudienceMark";

// Tarjeta de un Camino en el perfil de OTRA persona (riel del Nivel 2 y
// página dedicada): mismo `ListCard` genérico que usan las Listas, con la
// acción de tracking (no Guardar/Seguir — un Camino se trackea, no se
// guarda como una Lista) y el estado/progreso propio del dueño como meta.
export function CaminoProfileCard({
  camino,
  username,
  canTrack = true,
  className,
  showAudience = false,
}: {
  camino: CaminoProfileSummary;
  username: string;
  /** `false` en el propio perfil del dueño — no se puede trackear el propio Camino. */
  canTrack?: boolean;
  className?: string;
  /** Vista del dueño: marca el Camino si no es público (redesign-owner-profile-phase2). */
  showAudience?: boolean;
}) {
  const t = useTranslations("camino");

  return (
    <ListCard
      href={`/users/${encodeURIComponent(username)}/caminos/${camino.id}`}
      title={camino.title}
      coverThumbs={camino.coverThumbs}
      itemCount={camino.itemCount}
      entityType="release-group"
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
          {showAudience && camino.audience !== "public" && (
            <>
              <span aria-hidden>·</span>
              <AudienceMark audience={camino.audience} />
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
