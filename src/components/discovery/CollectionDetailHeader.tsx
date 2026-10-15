import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
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
  /** Lo que hace concreta a esta colección (qué ceremonia, cuándo), en lugar de la descripción genérica de su familia. */
  context?: { text: string; link?: { href: string; label: string } };
}

// Cabecera del detalle de una colección (ADR 0038). Es deliberadamente distinta de `ListDetailHeader`: una lista es
// de una persona (mosaico 2×2 al lado, "por <dueño>", audiencia, antigüedad); una colección es de la plataforma
// (portada a todo el ancho con la carátula difuminada de fondo, abanico de fundas, la familia como sello y una línea
// que dice qué reúne, y nada de audiencia ni fecha: una colección siempre es pública y se regenera).
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
  context,
}: CollectionDetailHeaderProps) {
  const t = useTranslations("lists");
  const tExplore = useTranslations("catalog.explore");

  const backdrop = list.coverThumbs[0] ?? null;

  return (
    // Portada de "muestra", no ficha de lista: una sola pieza a todo el ancho con la primera carátula difuminada como
    // luz de fondo, el texto a la izquierda y el abanico de fundas a la derecha (arriba en móvil). Una lista de persona
    // sigue con su ficha (mosaico 2×2 al lado del título, "por <dueño>", audiencia y fecha) sobre fondo liso.
    <header className="relative isolate overflow-hidden rounded-xl border border-ink-border bg-ink-surface">
      {backdrop ? (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <AppImage src={backdrop} alt="" fill sizes="768px" className="scale-125 object-cover opacity-35 blur-3xl saturate-150" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-6 p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-3 md:max-w-[55%]">
          <span className={`w-fit ${FAMILY_STAMP_CLASS}`}>{tExplore(`collectionFamilies.${family}`)}</span>
          <h1 className="font-display text-3xl leading-tight text-paper sm:text-4xl">{list.title}</h1>

          {/* Qué es esta colección: la descripción curada, el contexto concreto (la ceremonia) o, si no hay, la de su
              familia. */}
          <p className="max-w-prose whitespace-pre-wrap font-body text-sm text-paper-muted">
            {list.description ?? context?.text ?? tExplore(`collectionFamilyDescriptions.${family}`)}
          </p>
          {context?.link ? (
            <Link
              href={context.link.href}
              className="w-fit font-data text-xs text-paper underline decoration-dotted underline-offset-4 transition-colors hover:text-amber"
            >
              {context.link.label} →
            </Link>
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
            <div className="mt-1 flex flex-wrap items-start gap-3">
              <SaveListButton listId={list.id} initialSaved={saved} initialFollowing={following} />
              {list.entityType === "release-group" ? (
                <TrackListButton listId={list.id} initialTracking={tracking} initialProgress={trackingProgress} />
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex justify-center md:justify-end md:pr-2">
          <SleeveStack covers={list.coverThumbs} size="hero" />
        </div>
      </div>
    </header>
  );
}
