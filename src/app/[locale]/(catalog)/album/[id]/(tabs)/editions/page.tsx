import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EditionsTable, type EditionRow } from "@/components/album/EditionsTable";
import { isValidUuid } from "@/lib/validation";
import { variantKeyOf } from "@/services/catalog/edition-variants";
import { loadAlbumDetail, loadAlbumEditions } from "../../album-data";

// Pestaña Ediciones (openspec: redesign-album-page): todas las ediciones del álbum. Sin
// ediciones además de la representativa, la pestaña no existe: la URL directa responde 404.

interface AlbumEditionsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AlbumEditionsPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!isValidUuid(id)) return {};
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return {};
  const t = await getTranslations("catalog.album.tabs");
  return { title: `${t("editions")} · ${result.detail.releaseGroup.title}` };
}

export default async function AlbumEditionsPage({ params }: AlbumEditionsPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const result = await loadAlbumDetail(id);
  if (result.kind !== "ok") return null;

  const overview = await loadAlbumEditions(result.detail.releaseGroup.id);
  if (overview.editions.length <= 1) notFound();

  // Cada edición oficial de una variante (no caja) lleva "+N pistas" hacia su sección en Canciones.
  const variantByKey = new Map(
    overview.variants
      .filter((variant) => !variant.isBox)
      .flatMap((variant) => {
        const chosen = overview.editions.find((e) => e.id === variant.editionId);
        return chosen ? [[variantKeyOf(chosen), variant] as const] : [];
      }),
  );

  const rows: EditionRow[] = overview.editions.map((edition) => {
    const variant = edition.status === "Official" ? variantByKey.get(variantKeyOf(edition)) : undefined;
    return {
      id: edition.id,
      mbid: edition.mbid,
      title: edition.title,
      status: edition.status,
      year: edition.releaseYear,
      releaseDate: edition.releaseDate,
      country: edition.country,
      formats: edition.formats,
      trackCount: edition.trackCount,
      labels: edition.labels,
      variant: variant ? { editionId: variant.editionId, extraTracks: variant.estimatedExtraTracks } : null,
    };
  });

  return (
    <EditionsTable
      releaseGroupId={result.detail.releaseGroup.id}
      editions={rows}
      representativeMbid={overview.representativeMbid}
    />
  );
}
