"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import type { CaminoSummary } from "@/lib/api/schemas";
import type { MyCaminosListActions } from "./camino-list-shared";

interface CaminoCardMenuProps {
  camino: CaminoSummary;
  actions: MyCaminosListActions;
}

// Menú "⋮" con las acciones secundarias de un Camino propio — gestionar,
// archivar/desarchivar, eliminar — compartido por los tres modos de
// visualización, calcado de `ArtistJourneyCardMenu`. "Eliminar" no borra
// directo: pide al listado que abra el diálogo de confirmación (openspec:
// refine-progress-page-phase1, D2).
export function CaminoCardMenu({ camino, actions }: CaminoCardMenuProps) {
  const t = useTranslations("camino");
  const router = useRouter();

  return (
    <RowMenu label={t("cardMenuLabel", { title: camino.title })} triggerClassName="size-8 [@media(pointer:coarse)]:size-11">
      <RowMenuItem onSelect={() => router.push(`/me/caminos/${camino.id}`)}>{t("manage")}</RowMenuItem>
      <RowMenuItem onSelect={() => actions.archive(camino.id)}>
        {camino.state === "archived" ? t("unarchive") : t("archive")}
      </RowMenuItem>
      <RowMenuItem danger onSelect={() => actions.requestRemove(camino.id)}>
        {t("delete")}
      </RowMenuItem>
    </RowMenu>
  );
}
