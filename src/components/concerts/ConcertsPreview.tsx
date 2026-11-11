import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import type { ConcertEntryDto } from "@/lib/api/schemas";
import { formatConcertDate, formatConcertPlace } from "./concert-format";

// Riel Conciertos del perfil (openspec: add-my-concerts): los últimos registros visibles para el visitante y la puerta a
// la página completa. Solo lectura; la audiencia ya la filtró el servicio.

interface ConcertsPreviewProps {
  entries: readonly ConcertEntryDto[];
  total: number;
  username: string;
}

export function ConcertsPreview({ entries, total, username }: ConcertsPreviewProps) {
  const t = useTranslations("concerts.profile");
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-ink-border rounded border border-ink-border bg-ink-surface">
        {entries.map((entry) => {
          const place = formatConcertPlace(entry, locale);
          return (
            <li key={entry.id} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:gap-3">
              <span className="w-28 shrink-0 font-data text-xs text-paper-muted">{formatConcertDate(entry.eventDate, locale)}</span>
              <span className="min-w-0 flex-1">
                <Link href={artistHref(entry.artist.name, entry.artist.id)} className="font-display text-sm text-paper hover:underline">
                  {entry.artist.name}
                </Link>
                {place && <span className="block truncate font-body text-xs text-paper-muted">{place}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {total > entries.length && (
        <Link href={`/users/${username}/concerts`} className="self-start font-data text-xs text-paper-muted hover:text-paper">
          {t("seeAll")} →
        </Link>
      )}
    </div>
  );
}
