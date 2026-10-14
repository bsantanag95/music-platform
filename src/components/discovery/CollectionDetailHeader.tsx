import { useTranslations } from "next-intl";
import { SaveListButton } from "@/components/lists/SaveListButton";
import { TrackListButton } from "@/components/camino/TrackListButton";
import type { CollectionFamily } from "@/services/discovery/collections/families";
import type { UserListDetail } from "@/lib/api/schemas";
import { FAMILY_STAMP_CLASS, SleeveStack } from "./CollectionSleeves";

interface CollectionDetailHeaderProps {
  list: Pick<UserListDetail, "id" | "title" | "description" | "coverThumbs" | "itemCount" | "entityType">;
  family: CollectionFamily;
  /** Nombre de la plataforma ("Exploración" / "Explore"): texto, sin enlace a un perfil (ADR 0037). */
  platformName: string;
  saved?: boolean;
  following?: boolean;
  /** Hay sesión: se ofrece Guardar/Seguir. */
  canSave?: boolean;
  saveCount?: number;
  tracking?: boolean;
  trackingProgress?: { selectedCount: number; listenedCount: number } | null;
}

// Cabecera del detalle de una colección (ADR 0038). Es deliberadamente distinta de `ListDetailHeader`: una lista es
// de una persona (mosaico 2×2 al lado, "por <dueño>", audiencia, antigüedad); una colección es de la plataforma
// (abanico de fundas en su escenario, la familia como sello sobre la carátula, y nada de audiencia ni fecha: una
// colección siempre es pública y se regenera). Misma ficha vertical que la tarjeta de la página de colecciones, a
// escala de portada.
export function CollectionDetailHeader({
  list,
  family,
  platformName,
  saved = false,
  following = false,
  canSave = false,
  saveCount,
  tracking = false,
  trackingProgress = null,
}: CollectionDetailHeaderProps) {
  const t = useTranslations("lists");
  const tExplore = useTranslations("catalog.explore");

  return (
    <header className="flex flex-col gap-4">
      <div className="relative flex w-full items-center justify-center rounded-lg border border-ink-border bg-ink px-4 py-8 sm:py-10">
        <SleeveStack covers={list.coverThumbs} size="hero" />
        <span className={`absolute bottom-3 left-3 ${FAMILY_STAMP_CLASS}`}>{tExplore(`collectionFamilies.${family}`)}</span>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="font-display text-2xl text-paper sm:text-3xl">{list.title}</h1>

        {list.description ? (
          <p className="max-w-prose whitespace-pre-wrap font-body text-sm text-paper-muted">{list.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-data text-xs text-paper-muted">
          <span>{platformName}</span>
          <span aria-hidden>·</span>
          <span>{tExplore("collectionItems", { count: list.itemCount })}</span>
          {typeof saveCount === "number" && saveCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("savesCount", { count: saveCount })}</span>
            </>
          ) : null}
        </div>

        {canSave ? (
          <div className="flex flex-wrap items-start gap-3">
            <SaveListButton listId={list.id} initialSaved={saved} initialFollowing={following} />
            {list.entityType === "release-group" ? (
              <TrackListButton listId={list.id} initialTracking={tracking} initialProgress={trackingProgress} />
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
