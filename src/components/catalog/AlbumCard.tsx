"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { RowMenu, RowMenuItem } from "@/components/ui/RowMenu";
import { ListsContainingItemPanel } from "@/components/lists/ListsContainingItemPanel";
import { LazyCoverImage } from "./LazyCoverImage";
import type { ReleaseGroup } from "@/lib/api/schemas";

interface AlbumCardProps {
  releaseGroup: ReleaseGroup;
  categoryLabel: string;
  coverLabel: string;
  /** Hay sesión: habilita Guardar/Seguir en "Mostrar en listas". */
  authenticated?: boolean;
}

// Tarjeta de álbum dentro de la discografía. Usa `Link` de next-intl para
// preservar el locale activo al navegar al detalle del álbum. El menú "···"
// (openspec: show-item-in-lists) va superpuesto en la esquina de la portada,
// fuera del `Link` (no anidado dentro de él) para no pelear con su navegación
// — mismo motivo por el que `ListsContainingItemPanel` se abre debajo de la
// tarjeta y no dentro del enlace.
export function AlbumCard({ releaseGroup, categoryLabel, coverLabel, authenticated = false }: AlbumCardProps) {
  const t = useTranslations("lists");
  const [showingInLists, setShowingInLists] = useState(false);

  return (
    <div className="group relative flex w-full flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber">
      <Link href={`/album/${releaseGroup.id}`} className="flex flex-col gap-2">
        <LazyCoverImage
          releaseGroupId={releaseGroup.id}
          coverLabel={coverLabel}
          className="aspect-square w-full"
        />
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm text-paper">{releaseGroup.title}</h3>
          <p className="font-data text-xs text-paper-muted">
            {releaseGroup.firstReleaseYear !== null
              ? `${releaseGroup.firstReleaseYear} · ${categoryLabel}`
              : categoryLabel}
          </p>
        </div>
      </Link>
      <div className="absolute right-2 top-2 rounded-full bg-ink/80 backdrop-blur-sm">
        <RowMenu label={t("itemMenuLabel")}>
          <RowMenuItem onSelect={() => setShowingInLists((current) => !current)}>
            {t("showInLists")}
          </RowMenuItem>
        </RowMenu>
      </div>
      {showingInLists && (
        <ListsContainingItemPanel
          target={{ type: "release-group", id: releaseGroup.id }}
          canSave={authenticated}
          onClose={() => setShowingInLists(false)}
        />
      )}
    </div>
  );
}
