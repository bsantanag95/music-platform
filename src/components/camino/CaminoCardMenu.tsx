"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import type { CaminoSummary } from "@/lib/api/schemas";
import type { MyCaminosListActions } from "./camino-list-shared";

interface CaminoCardMenuProps {
  camino: CaminoSummary;
  actions: MyCaminosListActions;
  onRequestDelete: () => void;
}

// Menú "⋮" con las acciones secundarias de un Camino propio — gestionar,
// archivar/desarchivar, eliminar — compartido por los tres modos de
// visualización, calcado de `ArtistJourneyCardMenu`. "Eliminar" no borra
// directo: arma la confirmación de dos pasos del renderer que lo usa vía
// `onRequestDelete`.
export function CaminoCardMenu({ camino, actions, onRequestDelete }: CaminoCardMenuProps) {
  const t = useTranslations("camino");
  const router = useRouter();

  return (
    <RowMenu label={t("cardMenuLabel", { title: camino.title })}>
      <RowMenuItem onSelect={() => router.push(`/me/caminos/${camino.id}`)}>{t("manage")}</RowMenuItem>
      <RowMenuItem onSelect={() => actions.archive(camino.id)}>
        {camino.state === "archived" ? t("unarchive") : t("archive")}
      </RowMenuItem>
      <RowMenuItem danger onSelect={onRequestDelete}>
        {t("delete")}
      </RowMenuItem>
    </RowMenu>
  );
}
