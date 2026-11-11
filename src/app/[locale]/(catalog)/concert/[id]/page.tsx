import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AttendButton } from "@/components/concerts/AttendButton";
import { ReportConcertButton } from "@/components/concerts/ReportConcertButton";
import { formatConcertDate } from "@/components/concerts/concert-format";
import { attendeesLabel, sharedConcertPlace } from "@/components/concerts/shared-concert-format";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { artistHref, concertHref, concertSegment } from "@/lib/catalog-links";
import { resolveCatalogRoute } from "@/lib/catalog-route";
import { parseCatalogSegment } from "@/lib/slug";
import { resolveSession } from "@/services/auth/sessions";
import { getSharedConcert, mergedConcertTarget, type ConcertPerformerView } from "@/services/concerts/shared";
import { withClientMessages } from "@/i18n/client-messages";

// Página de un concierto compartido (openspec: add-shared-concerts-phase1): fecha, recinto, cartel, cuántas personas
// estuvieron, quiénes (según la audiencia de cada registro) y "Estuve ahí". Inexistente, oculto o cancelado: 404.
// Fase 2 (add-shared-concerts-phase2): uno por confirmar existe solo con sesión, con un aviso, lo que le falta y
// `noindex` (sin cifra, lista de personas ni creador); uno fusionado redirige al destino; uno de la comunidad confirmado
// muestra "Registrado por"; con sesión, "Reportar".

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const parsed = parseCatalogSegment(id);
  if (!parsed) return {};
  const session = await resolveSession();
  const concert = await getSharedConcert(parsed.id, session?.user.id ?? null);
  if (!concert) return {};
  const t = await getTranslations("concerts.shared.page");
  const title = t("metaTitle", { name: concert.name, date: formatConcertDate(concert.eventDate, await getLocale()) });
  // Por confirmar: fuera de los buscadores hasta que se confirme.
  return concert.status === "pending" ? { title, robots: { index: false, follow: false } } : { title };
}

function Performers({ title, performers }: { title: string; performers: ConcertPerformerView[] }) {
  if (performers.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-data text-xs text-paper-muted">{title}</h3>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {performers.map((performer) => (
          <li key={`${performer.role}-${performer.name}`} className="font-body text-sm text-paper">
            {performer.artistId ? (
              <Link href={artistHref(performer.name, performer.artistId)} className="hover:underline">
                {performer.name}
              </Link>
            ) : (
              performer.name
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

async function ConcertPage({ params, searchParams }: PageProps) {
  const { id: segment } = await params;
  const parsed = parseCatalogSegment(segment);
  if (!parsed) notFound();
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;
  const concert = await getSharedConcert(parsed.id, viewerId);
  if (!concert) {
    const target = await mergedConcertTarget(parsed.id);
    if (target) permanentRedirect(concertHref(target.name, target.id));
    notFound();
  }
  const locale = await getLocale();
  resolveCatalogRoute({
    locale,
    kind: "concert",
    segment,
    canonical: concertSegment(concert.name, concert.id),
    searchParams: await searchParams,
  });

  const t = await getTranslations("concerts.shared");
  const tCommunity = await getTranslations("concerts.community");
  const tCommon = await getTranslations("common");
  const pending = concert.status === "pending";
  const place = sharedConcertPlace(concert, locale);
  const people = attendeesLabel(concert.attendees, t);
  const byRole = (role: ConcertPerformerView["role"]) => concert.performers.filter((p) => p.role === role);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:py-12">
      <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: concert.name }]} />

      <header className="flex flex-col gap-2">
        <p className="font-data text-xs uppercase tracking-wide text-paper-muted">
          {formatConcertDate(concert.eventDate, locale)}
          {concert.kind === "festival" ? ` · ${t("festival")}` : ""}
        </p>
        <h1 className="font-display text-3xl text-paper">{concert.name}</h1>
        {place && <p className="font-body text-base text-paper">{place}</p>}
        {pending && (
          <div role="note" className="mt-2 flex flex-col gap-1 rounded border border-amber/40 bg-amber/5 p-3">
            <p className="font-data text-xs uppercase tracking-wide text-amber">{tCommunity("page.pendingTitle")}</p>
            <p className="font-body text-sm text-paper">{tCommunity("page.pendingBody")}</p>
            {concert.missing !== null && (
              <p className="font-data text-xs text-paper-muted">{tCommunity("missing", { count: concert.missing })}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          {people && <span className="font-data text-sm text-paper-muted">{people}</span>}
          {concert.attending !== null && !concert.upcoming && (
            <AttendButton concertId={concert.id} initialAttending={concert.attending} />
          )}
          {concert.attending === null && !concert.upcoming && (
            <Link href="/auth/login" className="font-data text-xs text-paper-muted hover:text-paper">
              {t("page.signIn")}
            </Link>
          )}
        </div>
      </header>

      <section aria-labelledby="concert-lineup" className="flex flex-col gap-3">
        <h2 id="concert-lineup" className="border-b border-ink-border pb-1 font-display text-xl text-paper">
          {t("page.lineup")}
        </h2>
        <Performers title={t("page.main")} performers={byRole("main")} />
        <Performers title={t("page.support")} performers={byRole("support")} />
        <Performers title={t("page.guest")} performers={byRole("guest")} />
      </section>

      {!pending && (
        <section aria-labelledby="concert-people" className="flex flex-col gap-3">
          <h2 id="concert-people" className="border-b border-ink-border pb-1 font-display text-xl text-paper">
            {t("page.people")}
          </h2>
          {concert.visibleAttendees.length === 0 ? (
            <p className="font-body text-sm text-paper-muted">{concert.attendees ? t("page.noVisiblePeople") : t("page.nobody")}</p>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {concert.visibleAttendees.map((person) => (
                <li key={person.username}>
                  <Link href={`/users/${person.username}`} className="font-body text-sm text-paper hover:underline">
                    {person.displayName ?? `@${person.username}`}
                  </Link>
                </li>
              ))}
              {concert.moreAttendees > 0 && (
                <li className="font-body text-sm text-paper-muted">{t("page.morePeople", { count: concert.moreAttendees })}</li>
              )}
            </ul>
          )}
        </section>
      )}

      <footer className="flex flex-col gap-2 border-t border-ink-border pt-3">
        {concert.setlistfmUrl && (
          <a
            href={concert.setlistfmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start font-data text-xs text-paper underline-offset-2 hover:underline"
          >
            {tCommunity("page.setlist")} ↗
          </a>
        )}
        {concert.registeredBy && (
          <p className="font-data text-xs text-paper-muted">
            {tCommunity("page.registeredBy")}{" "}
            <Link href={`/users/${concert.registeredBy.username}`} className="text-paper hover:underline">
              @{concert.registeredBy.username}
            </Link>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-data text-xs text-paper-muted">
            {concert.source === "community" ? tCommunity("page.communitySource") : tCommunity("page.musicbrainzSource")}
          </p>
          {viewerId && <ReportConcertButton concertId={concert.id} />}
        </div>
      </footer>
    </main>
  );
}

export default withClientMessages("(catalog)/concert/[id]/page", ConcertPage);
