import { notFound } from "next/navigation";
import { ArtistDiscography } from "@/components/artist/ArtistDiscography";
import { SearchOriginNotice } from "@/components/catalog/search-results/SearchOriginNotice";
import { isValidUuid } from "@/lib/validation";
import { DISCOGRAPHY_SECTIONS, type DiscographySection } from "@/services/catalog/discography-sections";
import { loadArtist, loadDiscography, loadDiscographyMarks, loadSession } from "../artist-data";

// Pestaña Discografía, la activa por defecto (openspec: redesign-artist-page, capability
// `artist-discography-view`). La sección vive en `?section=`: un valor desconocido o una
// sección vacía cae en la por defecto (Principal, o la primera con discos). Los grupos de una
// persona están en su pestaña Bandas (openspec: add-artist-members-tab), sin mezclar sus discos.

interface ArtistDiscographyPageProps {
  params: Promise<{ id: string }>;
  // `from=search&q=`: la búsqueda redirigió acá por coincidencia exacta única
  // (openspec: redesign-scoped-search) — se ofrece volver a la lista.
  searchParams?: Promise<{ section?: string | string[]; from?: string | string[]; q?: string | string[] }>;
}

function isSection(value: unknown): value is DiscographySection {
  return typeof value === "string" && (DISCOGRAPHY_SECTIONS as readonly string[]).includes(value);
}

export default async function ArtistDiscographyPage({ params, searchParams }: ArtistDiscographyPageProps) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const query = (await searchParams) ?? {};
  const fromSearch = query.from === "search" && typeof query.q === "string" && query.q.trim() ? query.q.trim() : null;

  const artist = await loadArtist(id);
  if (!artist) notFound();
  const session = await loadSession();
  const [view, marks] = await Promise.all([
    loadDiscography(artist.id),
    session ? loadDiscographyMarks(session.user.id, artist.id) : Promise.resolve(null),
  ]);
  const sections = view?.sections ?? [];
  const requested = isSection(query.section) ? query.section : null;
  const activeSection =
    requested && sections.some((s) => s.key === requested) ? requested : (sections[0]?.key ?? "main");

  return (
    <div className="flex flex-col gap-8">
      {fromSearch ? <SearchOriginNotice query={fromSearch} /> : null}
      <ArtistDiscography
        artistId={artist.id}
        sections={sections}
        activeSection={activeSection}
        bestRatedId={view?.bestRatedId ?? null}
        marks={marks}
        discographyComplete={artist.discographyCompleteAt !== null}
      />
    </div>
  );
}
