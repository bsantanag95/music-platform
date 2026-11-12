import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ConcertEntryDto } from "@/lib/api/schemas";
import { concertsByArtist } from "./concert-format";
import { ConcertArtistPhoto } from "./concert-ui";

// Vista "Por artista" de Mis conciertos (openspec: redesign-my-concerts): una tarjeta por artista con cuántas veces lo
// viste y en qué años. Lleva a Mis conciertos filtrada por ese artista (`?artista=`), donde están sus registros.

export function ConcertArtistGrid({ entries }: { entries: readonly ConcertEntryDto[] }) {
  const t = useTranslations("concerts");
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {concertsByArtist(entries).map((group) => (
        <li key={group.artist.id}>
          <Link
            href={`/me/concerts?artista=${group.artist.id}`}
            className="flex items-center gap-3 rounded-lg border border-ink-border bg-ink-surface p-2.5 transition-colors hover:border-paper-muted/50"
          >
            <ConcertArtistPhoto name={group.artist.name} photoUrl={group.artist.photoUrl ?? null} />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-display text-base text-paper">{group.artist.name}</span>
              <span className="font-data text-xs text-paper-muted">
                {t("byArtist.times", { count: group.count })} ·{" "}
                {group.firstYear === group.lastYear ? group.firstYear : `${group.firstYear}–${group.lastYear}`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
