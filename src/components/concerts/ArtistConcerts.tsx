import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SECONDARY_LINK } from "@/components/ui/segmented";
import { concertHref, tourHref } from "@/lib/catalog-links";
import type { ArtistConcertsPage, PendingConcertSummary, SharedConcertSummary } from "@/services/concerts/shared";
import { formatConcertDate, formatConcertShortDate } from "./concert-format";
import { CONCERT_BADGE, CONCERT_ROW, CONCERT_ROW_DATE, CONCERT_SECTION_HEADING } from "./concert-ui";
import { AddConcertButton } from "./AddConcertButton";
import { AttendButton } from "./AttendButton";
import { attendeesLabel, sharedConcertPlace } from "./shared-concert-format";

// Pestaña Conciertos del artista (openspec: add-shared-concerts-phase1): próximos arriba, después los pasados por año.
// Cada fila enlaza a la página del concierto y, con sesión, ofrece "Estuve ahí" en los pasados. Fase 2
// (add-shared-concerts-phase2): con sesión, "Agregar un concierto" y la sección "Por confirmar" (sin cifra de personas,
// con las confirmaciones que faltan); sin sesión no existe. Fase 3 (add-shared-concerts-phase3): cada fila nombra su gira
// y su festival, enlazados. La fecha va corta en su columna ("17 may"; con el año donde el encabezado no lo dice) y la
// fila se apila en pantallas angostas (`concert-ui`).

interface ArtistConcertsProps {
  artist: { id: string; name: string };
  data: ArtistConcertsPage;
  /** Dirección base de la pestaña, para la paginación. */
  baseHref: string;
  signedIn: boolean;
}

const SECTION_TITLE = `${CONCERT_SECTION_HEADING} font-display text-xl text-paper`;
const ROW_LIST = "flex flex-col divide-y divide-ink-border/70";

function ConcertRow({
  concert,
  artistId,
  withYear = false,
}: {
  concert: SharedConcertSummary | PendingConcertSummary;
  artistId: string;
  /** El año no está en el encabezado del grupo (Próximos, Por confirmar): va en la fecha. */
  withYear?: boolean;
}) {
  const t = useTranslations("concerts.shared");
  const tCommunity = useTranslations("concerts.community");
  const locale = useLocale();
  const place = sharedConcertPlace(concert, locale);
  const people = "missing" in concert ? tCommunity("missing", { count: concert.missing }) : attendeesLabel(concert.attendees, t);
  const attending = concert.upcoming ? null : concert.attending;
  return (
    <li className={CONCERT_ROW}>
      <time dateTime={concert.eventDate} title={formatConcertDate(concert.eventDate, locale)} className={CONCERT_ROW_DATE}>
        {formatConcertShortDate(concert.eventDate, locale, withYear)}
      </time>
      <div className={`col-span-2 flex min-w-0 flex-col gap-1 ${attending === null ? "" : "sm:col-span-1"}`}>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={concertHref(concert.name, concert.id)}
            className="text-pretty font-display text-base leading-snug text-paper underline-offset-4 hover:underline"
          >
            {concert.name}
          </Link>
          {concert.kind === "festival" && <span className={CONCERT_BADGE}>{t("festival")}</span>}
        </span>
        {place && <span className="font-body text-sm text-paper-muted">{place}</span>}
        {(concert.tour || concert.parent || people) && (
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 font-data text-xs text-paper-muted">
            {concert.parent && (
              <span>
                {t("partOf")}{" "}
                <Link href={concertHref(concert.parent.name, concert.parent.id)} className="text-paper underline-offset-2 hover:underline">
                  {concert.parent.name}
                </Link>
              </span>
            )}
            {concert.tour && (
              <span>
                {t("tour")}{" "}
                <Link href={tourHref(concert.tour.name, concert.tour.id)} className="text-paper underline-offset-2 hover:underline">
                  {concert.tour.name}
                </Link>
              </span>
            )}
            {people && <span>{people}</span>}
          </span>
        )}
      </div>
      {attending !== null && (
        // La clave remonta el botón cuando el servidor cambia el valor (p. ej., "Estuve ahí" desde el diálogo de crear).
        // En pantallas angostas va debajo del contenido, a la izquierda, para no estrechar el título.
        <div className="col-span-2 flex pt-1 sm:col-span-1 sm:justify-end sm:pt-0">
          <AttendButton key={`${concert.id}-${attending}`} concertId={concert.id} artistId={artistId} initialAttending={attending} />
        </div>
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
      <div className="flex flex-col items-start gap-3 rounded-lg border border-ink-border bg-ink-surface px-5 py-8 sm:px-8">
        <p className="font-display text-lg text-paper">{t("empty")}</p>
        {signedIn ? (
          <>
            <p className="max-w-prose text-pretty font-body text-sm text-paper-muted">{tCommunity("addHint")}</p>
            {addButton}
          </>
        ) : (
          <>
            <p className="max-w-prose text-pretty font-body text-sm text-paper-muted">{t("emptyHint")}</p>
            <Link href="/me/concerts" className={`font-data text-xs ${SECONDARY_LINK}`}>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="max-w-prose text-pretty font-body text-sm text-paper-muted">{tCommunity("addHint")}</p>
          <div className="shrink-0">{addButton}</div>
        </div>
      )}
      {data.upcoming.length > 0 && (
        <section aria-labelledby="concerts-upcoming" className="flex flex-col gap-1">
          <h2 id="concerts-upcoming" className={SECTION_TITLE}>
            {t("upcoming")}
          </h2>
          <ul className={ROW_LIST}>
            {data.upcoming.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} artistId={artist.id} withYear />
            ))}
          </ul>
        </section>
      )}
      {years.map((group) => (
        <section key={group.year} aria-labelledby={`concerts-${group.year}`} className="flex flex-col gap-1">
          <h2 id={`concerts-${group.year}`} className={`${SECTION_TITLE} tabular-nums`}>
            {group.year}
          </h2>
          <ul className={ROW_LIST}>
            {group.concerts.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} artistId={artist.id} />
            ))}
          </ul>
        </section>
      ))}
      {(data.page > 1 || data.hasNext) && (
        <nav aria-label={t("pagination")} className="flex justify-between border-t border-ink-border pt-4 font-data text-xs">
          {data.page > 1 ? (
            <Link
              href={data.page === 2 ? baseHref : `${baseHref}?pagina=${data.page - 1}`}
              scroll={false}
              className="py-1 text-paper underline-offset-2 hover:underline"
            >
              ← {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          {data.hasNext && (
            <Link href={`${baseHref}?pagina=${data.page + 1}`} scroll={false} className="py-1 text-paper underline-offset-2 hover:underline">
              {t("older")} →
            </Link>
          )}
        </nav>
      )}
      {data.pending.length > 0 && (
        <section aria-labelledby="concerts-pending" className="flex flex-col gap-1">
          <h2 id="concerts-pending" className={SECTION_TITLE}>
            {tCommunity("pendingTitle")}
          </h2>
          <p className="max-w-prose pt-1 text-pretty font-body text-sm text-paper-muted">{tCommunity("pendingIntro")}</p>
          <ul className={ROW_LIST}>
            {data.pending.map((concert) => (
              <ConcertRow key={concert.id} concert={concert} artistId={artist.id} withYear />
            ))}
          </ul>
        </section>
      )}
      <p className="font-data text-xs text-paper-muted">{t("source")}</p>
    </div>
  );
}
