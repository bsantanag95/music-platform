import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArtistConcerts } from "@/components/concerts/ArtistConcerts";
import { artistHref, artistSegment } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { ensureArtistConcerts } from "@/services/concerts/concert-sync";
import { listArtistConcerts } from "@/services/concerts/shared";
import { withClientMessages } from "@/i18n/client-messages";
import { loadArtist, loadSession } from "../../artist-data";

// Pestaña Conciertos (openspec: add-shared-concerts-phase1, capability `shared-concerts`). Trae bajo demanda los eventos
// de MusicBrainz del artista (la primera página antes de responder, el resto después) y lista los conciertos
// confirmados. Solo grupos y personas; para otros tipos la URL responde 404. `?pagina=` inválida cae a la primera.

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const artist = await loadArtist(parsed.id);
  if (!artist) return {};
  const t = await getTranslations("catalog.artist.tabs");
  return { title: `${t("concerts")} · ${artist.name}` };
}

function readPage(value: string | string[] | undefined): number {
  const page = typeof value === "string" ? Number(value) : 1;
  return Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1;
}

async function ArtistConcertsPage({ params, searchParams }: PageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const artist = await loadArtist(parsed.id);
  if (!artist || (artist.type !== "group" && artist.type !== "person")) notFound();
  const query = await searchParams;
  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "artist",
    segment,
    canonical: artistSegment(artist.name, artist.id),
    subpath: "/concerts",
    searchParams: query,
  });

  await ensureArtistConcerts(artist);
  const session = await loadSession();
  const page = readPage(query.pagina);
  let data = await listArtistConcerts(artist, session?.user.id ?? null, page);
  if (page > 1 && data.past.length === 0) data = await listArtistConcerts(artist, session?.user.id ?? null, 1);

  return <ArtistConcerts artistId={artist.id} data={data} baseHref={`${artistHref(artist.name, artist.id)}/concerts`} />;
}

export default withClientMessages("(catalog)/artist/[id]/(tabs)/concerts/page", ArtistConcertsPage);
