import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AttendButton } from "@/components/concerts/AttendButton";
import { formatConcertDate } from "@/components/concerts/concert-format";
import { attendeesLabel, sharedConcertPlace } from "@/components/concerts/shared-concert-format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { artistHref, concertHref, tourSegment } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { resolveSession } from "@/services/auth/sessions";
import { getTour } from "@/services/concerts/tours";
import type { SharedConcertSummary } from "@/services/concerts/shared";
import { withClientMessages } from "@/i18n/client-messages";

// Página de una gira (openspec: add-shared-concerts-phase3, capability `concert-tours-festivals`): sus artistas
// principales, sus fechas públicas (próximas y pasadas por año), cuántas son y, con sesión, en cuántas estuvo quien mira.
// Inexistente o sin fechas visibles: 404.

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const tour = await getTour(parsed.id, null);
  if (!tour) return {};
  const t = await getTranslations("concerts.tour");
  return { title: t("metaTitle", { name: tour.name }) };
}

async function TourConcerts({ concerts, title, id }: { concerts: SharedConcertSummary[]; title: string; id: string }) {
  const t = await getTranslations("concerts.shared");
  const locale = await getLocale();
  if (concerts.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="border-b border-ink-border pb-1 font-display text-xl text-paper">
        {title}
      </h2>
      <ul className="flex flex-col divide-y divide-ink-border">
        {concerts.map((concert) => {
          const place = sharedConcertPlace(concert, locale);
          const people = attendeesLabel(concert.attendees, t);
          return (
            <li key={concert.id} className="flex items-start gap-4 py-3">
              <span className="w-32 shrink-0 font-data text-xs text-paper-muted">{formatConcertDate(concert.eventDate, locale)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Link href={concertHref(concert.name, concert.id)} className="font-display text-base text-paper hover:underline">
                  {concert.name}
                </Link>
                {place && <span className="font-body text-sm text-paper-muted">{place}</span>}
                {people && <span className="font-data text-xs text-paper-muted">{people}</span>}
              </div>
              {concert.attending !== null && !concert.upcoming && (
                <AttendButton key={`${concert.id}-${concert.attending}`} concertId={concert.id} initialAttending={concert.attending} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

async function TourPage({ params, searchParams }: PageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const session = await resolveSession();
  const tour = await getTour(parsed.id, session?.user.id ?? null);
  if (!tour) notFound();
  resolveCatalogRoute({
    locale: await getLocale(),
    kind: "tour",
    segment,
    canonical: tourSegment(tour.name, tour.id),
    searchParams: await searchParams,
  });

  const t = await getTranslations("concerts.tour");
  const tShared = await getTranslations("concerts.shared");
  const tCommon = await getTranslations("common");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: tour.name }]} />

      <header className="flex flex-col gap-2">
        <p className="font-data text-xs uppercase tracking-wide text-paper-muted">{t("eyebrow")}</p>
        <h1 className="font-display text-3xl text-paper">{tour.name}</h1>
        {tour.artists.length > 0 && (
          <p className="font-body text-base text-paper">
            {tour.artists.map((artist, index) => (
              <span key={`${artist.name}-${index}`}>
                {index > 0 && ", "}
                {artist.artistId ? (
                  <Link href={artistHref(artist.name, artist.artistId)} className="hover:underline">
                    {artist.name}
                  </Link>
                ) : (
                  artist.name
                )}
              </span>
            ))}
          </p>
        )}
        <p className="font-data text-sm text-paper-muted">
          {[t("dates", { count: tour.total }), tour.attended ? t("attended", { count: tour.attended }) : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <TourConcerts concerts={tour.upcoming} title={tShared("upcoming")} id="tour-upcoming" />
      <TourConcerts concerts={tour.past} title={t("past")} id="tour-past" />

      <p className="font-data text-xs text-paper-muted">{t("source")}</p>
    </main>
  );
}

export default withClientMessages("(catalog)/tour/[id]/page", TourPage);
