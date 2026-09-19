"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CollectionPreviewArtist } from "@/services/collection/types";
import { CollectionModeSwitcher } from "./CollectionModeSwitcher";
import { EntriesDetailed } from "./EntriesDetailed";
import { EntriesIndex } from "./EntriesIndex";
import { ShelfGrid } from "./ShelfGrid";
import type { CollectionGroup } from "./collection-shared";
import { useCollectionViewMode } from "./use-collection-view-mode";

interface CollectionPreviewProps {
  artists: CollectionPreviewArtist[];
  /** Total real de copias visibles del perfil. */
  totalEntries: number;
  username: string;
}

// Estante "Colección" del perfil (Nivel 2): la misma colección agrupada por
// artista y con los tres modos de visualización de siempre, pero con tope — los
// artistas de los que más copias tiene y, de cada uno, sus copias más recientes
// (elegido entre mockups: "más copias primero"). Cada artista muestra su total
// real y, si hay más de las que se ven, "Ver los N" a la página dedicada
// `/users/[username]/collection` con el buscador ya cargado con ese artista;
// al pie, "Ver toda la colección". Solo lectura y sin paginación en cliente:
// todo lo que ve viene ya resuelto del servidor.
export function CollectionPreview({ artists, totalEntries, username }: CollectionPreviewProps) {
  const t = useTranslations("collection");
  const [mode, setMode] = useCollectionViewMode();
  const base = `/users/${encodeURIComponent(username)}/collection`;

  const groups: CollectionGroup[] = artists.map((artist) => ({
    key: artist.name ?? "__unknown-artist__",
    heading: artist.name ?? t("unknownArtist"),
    count: artist.total,
    entries: artist.entries,
    // Sin nombre no hay nada que buscar, así que ese grupo no lleva enlace.
    moreHref:
      artist.name && artist.total > artist.entries.length
        ? `${base}?q=${encodeURIComponent(artist.name)}`
        : null,
  }));

  const shown = artists.reduce((sum, artist) => sum + artist.entries.length, 0);
  const Renderer = mode === "detailed" ? EntriesDetailed : mode === "index" ? EntriesIndex : ShelfGrid;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex justify-end">
        <CollectionModeSwitcher mode={mode} onChange={setMode} />
      </div>

      <Renderer groups={groups} actions={null} selection={null} />

      {totalEntries > shown ? (
        <Link
          href={base}
          className="self-start rounded-md border border-ink-border bg-ink-surface px-4 py-2 font-data text-sm text-paper transition-colors hover:border-amber"
        >
          {t("viewFullCollection", { count: totalEntries })}
        </Link>
      ) : null}
    </div>
  );
}
