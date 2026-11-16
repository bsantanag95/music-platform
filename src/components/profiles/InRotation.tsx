import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { albumHref, songHref } from "@/lib/catalog-links";
import type { InRotation as InRotationData } from "@/services/profiles/in-rotation";
import { ProfileSectionHeading } from "./ProfileSectionHeading";

interface InRotationProps {
  data: InRotationData;
}

// Sección "En rotación": lo que esta persona ha estado escuchando últimamente,
// derivado del diario. Contraparte viva de la Tarjeta de Identidad y de "Empieza por
// aquí" (identidad estable). Abre el Nivel 2 del perfil, en una sola fila
// (openspec: redesign-user-profile-phase2): los álbumes con su carátula y, al lado,
// las canciones. Tono cultural: sin score, sin contadores, sin fechas, sin
// numeración (openspec: add-profile-in-rotation, D5). Server Component; un bloque
// vacío no se renderiza.
export async function InRotation({ data }: InRotationProps) {
  const t = await getTranslations("users");
  if (data.songs.length === 0 && data.albums.length === 0) return null;

  return (
    <section className="flex w-full flex-col gap-4">
      <ProfileSectionHeading title={t("inRotation.heading")} />
      <div className="flex flex-col gap-x-10 gap-y-4 lg:flex-row lg:items-start">
        {data.albums.length > 0 && (
          <ul aria-label={t("inRotation.albumsHeading")} className="grid gap-4 sm:grid-cols-3 lg:flex-[2]">
            {data.albums.map((album) => (
              <li key={album.id} className="min-w-0">
                <Link href={albumHref(album.artistName, album.title, album.id)} className="group flex items-center gap-3">
                  <CoverThumb
                    cover={album.coverThumbUrl}
                    label=""
                    className="size-14 rounded border border-ink-border transition-colors group-hover:border-amber"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {album.title}
                    </span>
                    {album.artistName && (
                      <span className="block truncate font-data text-xs text-paper-muted">{album.artistName}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data.songs.length > 0 && (
          <ul
            aria-label={t("inRotation.songsHeading")}
            className="flex min-w-0 flex-col divide-y divide-ink-border lg:flex-1"
          >
            {data.songs.map((song) => (
              <li key={song.id} className="min-w-0 py-1.5 first:pt-0 last:pb-0">
                <Link href={songHref(song.artistName, song.title, song.id)} className="group flex items-baseline gap-2">
                  <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {song.title}
                  </span>
                  {song.artistName && (
                    <span className="truncate font-data text-xs text-paper-muted">{song.artistName}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
