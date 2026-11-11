import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { concertHref } from "@/lib/catalog-links";
import type { ArtistConcertsPage, PendingConcertSummary, SharedConcertSummary } from "@/services/concerts/shared";
import { formatConcertDate } from "./concert-format";
import { AddConcertButton } from "./AddConcertButton";
import { AttendButton } from "./AttendButton";
import { attendeesLabel, sharedConcertPlace } from "./shared-concert-format";

// Pestaña Conciertos del artista (openspec: add-shared-concerts-phase1): próximos arriba, después los pasados por año.
// Cada fila enlaza a la página del concierto y, con sesión, ofrece "Estuve ahí" en los pasados. Fase 2
// (add-shared-concerts-phase2): con sesión, "Agregar un concierto" y la sección "Por confirmar" (sin cifra de personas,
// con las confirmaciones que faltan); sin sesión no existe.

interface ArtistConcertsProps {
  artist: { id: string; name: string };
  data: ArtistConcertsPage;
  /** Dirección base de la pestaña, para la paginación. */
  baseHref: string;
  signedIn: boolean;
}

function ConcertRow({ concert, artistId }: { concert: SharedConcertSummary | PendingConcertSummary; artistId: string }) {
  const t = useTranslations("concerts.shared");
  const tCommunity = useTranslations("concerts.community");
  const locale = useLocale();
  const place = sharedConcertPlace(concert, locale);
  const people = "missing" in concert ? tCommunity("missing", { count: concert.missing }) : attendeesLabel(concert.attendees, t);
  return (
    <li className="flex items-start gap-4 py-3">
      <span className="w-32 shrink-0 font-data text-xs text-paper-muted">{formatConcertDate(concert.eventDate, locale)}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline gap-2">
          <Link href={concertHref(concert.name, concert.id)} className="font-display text-base text-paper hover:underline">
            {concert.name}
          </Link>
          {concert.kind === "festival" && (
            <span className="rounded border border-ink-border px-1.5 font-data text-[0.65rem] uppercase tracking-wide text-paper-muted">
              {t("festival")}
            </span>
          )}
        </span>
        {place && <span className="font-body text-sm text-paper-muted">{place}</span>}
        {people && <span className="font-data text-xs text-paper-muted">{people}</span>}
      </div>
      {concert.attending !== null && !concert.upcoming && (
        // La clave remonta el botón cuando el servidor cambia el valor (p. ej., "Estuve ahí" desde el diálogo de crear).
        <AttendButton
          key={`${concert.id}-${concert.attending}`}
          concertId={concert.id}
          artistId={artistId}
          initialAttending={concert.attending}
        />
      )}
    </li>
  );
}

export function ArtistConcerts({ artist, data, baseHref, signedIn }: ArtistConcertsProps) {
  const t = useTranslations("concerts.shared");
  const tCommunity = useTranslations("concerts.community");
  const years: { year: string; concerts: SharedConcertSummary[] }[] = [];
  for (const concert of data.past) {
    const year = concert.eventDate.slice(0, 4);
    const last = years.at(-1);
    if (last?.year === year) last.concerts.push(concert);
    else years.push({ year, concerts: [concert] });
  }
  const empty = data.upcoming.length === 0 && data.past.length === 0 && data.pending.length === 0 && data.page === 1;
  const addButton = signedIn ? <AddConcertButton artist={artist} /> : null;

  if (empty) {
    return (
      <div className="flex flex-col gap-2 rounded border border-ink-border bg-ink-surface p-6">
        <p className="font-body text-sm text-paper">{t("empty")}</p>
        {signedIn ? (
          <>
            <p className="font-body text-sm text-paper-muted">{tCommunity("addHint")}</p>
            <div>{addButton}</div>
          </>
        ) : (
          <>
            <p className="font-body text-sm text-paper-muted">{t("emptyHint")}</p>
            <Link href="/me/concerts" className="self-start font-data text-xs text-paper underline-offset-2 hover:underline">
              {t("emptyLink")} →
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {addButton && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-body text-sm text-paper-muted">{tCommunity("addHint")}</p>
          {addButton}
        </div>
      )}
      {data.upcoming.length > 0 && (
        <section aria-labelledby="concerts-upcoming" className="flex flex-col gap-2">
          <h2 id="concerts-upcoming" className="border-b border-ink-border pb-1 font-display text-xl text-paper">
            {t("upcoming")}
          </h2>
          <ul className="flex flex-col divide-y divide-ink-border">
            {data.upcoming.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} artistId={artist.id} />
            ))}
          </ul>
        </section>
      )}
      {years.map((group) => (
        <section key={group.year} aria-labelledby={`concerts-${group.year}`} className="flex flex-col gap-2">
          <h2 id={`concerts-${group.year}`} className="border-b border-ink-border pb-1 font-display text-xl text-paper">
            {group.year}
          </h2>
          <ul className="flex flex-col divide-y divide-ink-border">
            {group.concerts.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} artistId={artist.id} />
            ))}
          </ul>
        </section>
      ))}
      {(data.page > 1 || data.hasNext) && (
        <nav className="flex justify-between font-data text-xs">
          {data.page > 1 ? (
            <Link href={data.page === 2 ? baseHref : `${baseHref}?pagina=${data.page - 1}`} scroll={false} className="text-paper hover:underline">
              ← {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          {data.hasNext && (
            <Link href={`${baseHref}?pagina=${data.page + 1}`} scroll={false} className="text-paper hover:underline">
              {t("older")} →
            </Link>
          )}
        </nav>
      )}
      {data.pending.length > 0 && (
        <section aria-labelledby="concerts-pending" className="flex flex-col gap-2">
          <h2 id="concerts-pending" className="border-b border-ink-border pb-1 font-display text-xl text-paper">
            {tCommunity("pendingTitle")}
          </h2>
          <p className="font-body text-sm text-paper-muted">{tCommunity("pendingIntro")}</p>
          <ul className="flex flex-col divide-y divide-ink-border">
            {data.pending.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} artistId={artist.id} />
            ))}
          </ul>
        </section>
      )}
      <p className="font-data text-xs text-paper-muted">{t("source")}</p>
    </div>
  );
}
