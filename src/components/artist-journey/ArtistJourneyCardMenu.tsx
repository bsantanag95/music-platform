"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import type { ArtistJourneySummary } from "@/lib/api/schemas";
import type { ArtistJourneyListActions } from "./artist-journey-list-shared";

interface ArtistJourneyCardMenuProps {
  journey: ArtistJourneySummary;
  actions: ArtistJourneyListActions;
  onRequestDelete: () => void;
}

// Menú "⋮" con las tres acciones secundarias de una entrada del listado
// propio — ver artista, archivar/desarchivar, eliminar — compartido por los
// tres modos de visualización (Detallada, Índice, Gráfico): mismo primitivo
// `RowMenu` que el menú de fila del Diario. "Eliminar" no borra directo:
// arma la confirmación de dos pasos del renderer que lo usa vía
// `onRequestDelete`, en vez de ejecutar el borrado desde el propio menú.
export function ArtistJourneyCardMenu({ journey, actions, onRequestDelete }: ArtistJourneyCardMenuProps) {
  const t = useTranslations("artistJourney");
  const router = useRouter();

  return (
    <RowMenu label={t("cardMenuLabel", { artist: journey.artistName })}>
      <RowMenuItem onSelect={() => router.push(`/artist/${journey.artistId}`)}>
        {t("viewArtist")}
      </RowMenuItem>
      <RowMenuItem onSelect={() => actions.archive(journey.artistId)}>
        {journey.state === "archived" ? t("unarchive") : t("archive")}
      </RowMenuItem>
      <RowMenuItem danger onSelect={onRequestDelete}>
        {t("listDeleteItem")}
      </RowMenuItem>
    </RowMenu>
  );
}
