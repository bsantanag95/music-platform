"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import type { ArtistJourneySummary } from "@/lib/api/schemas";
import type { ArtistJourneyListActions } from "./artist-journey-list-shared";

interface ArtistJourneyCardMenuProps {
  journey: ArtistJourneySummary;
  actions: ArtistJourneyListActions;
}

// Menú "⋮" con las tres acciones secundarias de una entrada del listado
// propio — ver artista, archivar/desarchivar, eliminar — compartido por los
// tres modos de visualización (Detallada, Índice, Gráfico): mismo primitivo
// `RowMenu` que el menú de fila del Diario. "Eliminar" no borra directo: pide
// al listado que abra el diálogo de confirmación (openspec: refine-progress-page-phase1, D2).
// El disparador mide 32 px, 44 con puntero grueso (D8).
export function ArtistJourneyCardMenu({ journey, actions }: ArtistJourneyCardMenuProps) {
  const t = useTranslations("artistJourney");
  const router = useRouter();

  return (
    <RowMenu
      label={t("cardMenuLabel", { artist: journey.artistName })}
      triggerClassName="size-8 [@media(pointer:coarse)]:size-11"
    >
      <RowMenuItem onSelect={() => router.push(artistHref(journey.artistName, journey.artistId))}>
        {t("viewArtist")}
      </RowMenuItem>
      <RowMenuItem onSelect={() => actions.archive(journey.artistId)}>
        {journey.state === "archived" ? t("unarchive") : t("archive")}
      </RowMenuItem>
      <RowMenuItem danger onSelect={() => actions.requestRemove(journey.artistId)}>
        {t("listDeleteItem")}
      </RowMenuItem>
    </RowMenu>
  );
}
