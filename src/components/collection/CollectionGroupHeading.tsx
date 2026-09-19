"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CollectionGroup } from "./collection-shared";

// Encabezado de una sección de la colección (artista, formato o mes): título +
// conteo, y —solo cuando la sección muestra una parte de sus copias, como en la
// previsualización del perfil— el enlace "Ver los N" a la colección completa.
// Lo comparten los tres modos de visualización para que no se desalineen.
export function CollectionGroupHeading({
  group,
  className = "",
}: {
  group: CollectionGroup;
  className?: string;
}) {
  const t = useTranslations("collection");
  if (!group.heading) return null;

  return (
    <h3 className={`flex items-baseline gap-2 font-display text-base text-paper ${className}`}>
      {group.heading}
      {group.count !== null ? (
        <span className="font-data text-xs text-paper-muted">{group.count}</span>
      ) : null}
      {group.moreHref && group.count !== null ? (
        <Link
          href={group.moreHref}
          className="ml-auto font-data text-xs font-normal text-paper-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-paper"
        >
          {t("viewAllOfGroup", { count: group.count })}
        </Link>
      ) : null}
    </h3>
  );
}
