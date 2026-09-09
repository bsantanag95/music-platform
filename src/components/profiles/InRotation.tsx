import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import type { InRotation as InRotationData } from "@/services/profiles/in-rotation";

interface InRotationProps {
  data: InRotationData;
}

// Sección "En rotación": lo que esta persona ha estado escuchando últimamente,
// derivado del diario. Contraparte viva de "Álbumes favoritos" (identidad
// estable). Canciones = señal primaria (arriba), álbumes = agrupación
// contextual (abajo). Tono cultural: sin score, sin contadores, sin fechas,
// sin numeración (openspec: add-profile-in-rotation, D5). Server Component;
// un bloque vacío no se renderiza.
export async function InRotation({ data }: InRotationProps) {
  const t = await getTranslations("users");
  if (data.songs.length === 0 && data.albums.length === 0) return null;

  return (
    <section className="flex w-full max-w-2xl flex-col gap-5">
      <h2 className="font-display text-xl text-paper">{t("inRotation.heading")}</h2>

      {data.songs.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("inRotation.songsHeading")}
          </h3>
          <ul className="flex flex-col divide-y divide-ink-border rounded-lg border border-ink-border">
            {data.songs.map((song) => (
              <li key={song.id}>
                <Link
                  href={`/song/${song.id}`}
                  className="group flex flex-col px-3 py-2 transition-colors hover:bg-ink-surface"
                >
                  <span className="truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {song.title}
                  </span>
                  {song.artistName && (
                    <span className="truncate font-data text-xs text-paper-muted">
                      {song.artistName}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.albums.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
            {t("inRotation.albumsHeading")}
          </h3>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.albums.map((album) => (
              <li key={album.id}>
                <Link href={`/album/${album.id}`} className="group flex flex-col gap-2">
                  <CoverThumb
                    cover={album.coverThumbUrl}
                    label=""
                    className="aspect-square w-full rounded-lg border border-ink-border transition-colors group-hover:border-amber"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {album.title}
                    </span>
                    {album.artistName && (
                      <span className="block truncate font-data text-xs text-paper-muted">
                        {album.artistName}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
