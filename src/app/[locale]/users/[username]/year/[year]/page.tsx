import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTimeZone, getTranslations } from "next-intl/server";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LaminaCta } from "@/components/laminas/LaminaCta";
import { YearHiddenList, YearHideButton, YearTopEditor } from "@/components/laminas/YearCuration";
import { OwnShareButton } from "@/components/share/OwnShareSheet";
import { ShareAction } from "@/components/share/ShareAction";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { albumHref } from "@/lib/catalog-links";
import { yearBuildHref } from "@/lib/laminas/intent";
import { resolveSession } from "@/services/auth/sessions";
import { currentYearIn, getYearInDiscs, parseYear } from "@/services/laminas/year";
import { buildShareMetadata } from "@/services/share/metadata";
import { yearRef, yearRefFor } from "@/services/share/targets/year";

// Tu año en discos (spec year-laminas, openspec: add-year-in-discs-phase1): el año de una persona en discos, mes por mes, y sus cifras, derivado del
// diario. Lo ve su dueño, en su zona; a cualquier otra persona se lo abre solo la marca del año, en la zona guardada al compartir. Nunca muestra el texto
// de una escucha, su reacción ni una nota.

interface PageProps {
  params: Promise<{ username: string; year: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, year: rawYear } = await params;
  const year = parseYear(rawYear);
  const ref = year === null ? null : await yearRefFor(username, year);
  return ref ? buildShareMetadata("year", ref, await getLocale(), { withTitle: true }) : {};
}

async function UserYearPage({ params }: PageProps) {
  const { username, year: rawYear } = await params;
  const year = parseYear(rawYear);
  if (year === null) notFound();
  const session = await resolveSession();
  const timeZone = await getTimeZone();
  const data = await getYearInDiscs(username, year, session?.user.id ?? null, timeZone);
  if (!data) {
    // Año propio sin escuchas (add-year-in-discs-phase3): quien llega desde "Arma la tuya" recién registrado no tiene diario todavía. Solo para el
    // dueño y hasta el año en curso; para cualquier otra persona, y para un año futuro, sigue siendo 404.
    if (!session || session.user.username.toLowerCase() !== username.toLowerCase() || year > currentYearIn(timeZone)) notFound();
    return emptyOwnYear(await getTranslations("laminas.year"), session.user.username, year, year === currentYearIn(timeZone));
  }

  const t = await getTranslations("laminas.year");
  const locale = await getLocale();
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" });
  const ref = yearRef(data.owner.id, data.year);
  const stats = [
    { label: t("stats.listens"), value: data.stats.listens },
    { label: t("stats.discs"), value: data.stats.discs },
    { label: t("stats.newDiscs"), value: data.stats.newDiscs },
    { label: t("stats.artistsDiscovered"), value: data.stats.artistsDiscovered },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/users/${encodeURIComponent(username)}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{username}
        </Link>
        {data.isOwner ? <OwnShareButton kind="year" refId={ref} /> : <ShareAction kind="year" refId={ref} />}
      </div>
      <header className="flex flex-col gap-1">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("kicker")}</p>
        <h1 className="font-display text-3xl text-paper">{data.inProgress ? t("titleInProgress", { year: data.year }) : t("title", { year: data.year })}</h1>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5 rounded border border-ink-border bg-ink-surface p-3">
            <dt className="font-data text-xs text-paper-muted">{stat.label}</dt>
            <dd className="font-display text-2xl text-paper">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="font-data text-xs text-paper-muted">{t("statsNote")}</p>

      {/* Top 5 del año (add-year-in-discs-phase2): el dueño lo elige; los demás lo ven, sin notas. */}
      {data.top.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-paper">{t("topTitle")}</h2>
          {data.isOwner ? (
            <YearTopEditor year={data.year} top={data.top} custom={data.topIsCustom} choices={data.choices} />
          ) : (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {data.top.map((disc, index) => (
                <li key={disc.id} className="flex min-w-0 flex-col gap-1">
                  <Link href={albumHref(disc.artistName, disc.title, disc.id)} className="block aspect-square w-full rounded transition-opacity hover:opacity-80">
                    <CoverThumb cover={disc.coverThumbUrl} label={disc.title} className="aspect-square w-full rounded" />
                  </Link>
                  <span className="flex gap-1.5 font-display text-sm text-paper">
                    <span className={`font-data ${index === 0 ? "text-amber" : "text-paper-muted"}`}>{index + 1}</span>
                    <span className="min-w-0 truncate">{disc.title}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.months.map((month) => {
          const name = monthName.format(new Date(Date.UTC(data.year, month.month - 1, 1)));
          return (
            <li key={month.month} className="flex min-w-0 flex-col gap-2 rounded border border-ink-border bg-ink-surface p-3">
              <h2 className="font-display text-sm capitalize text-paper">{name}</h2>
              {month.discs.length === 0 ? (
                <p className="font-data text-xs text-paper-muted">{t("emptyMonth")}</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5" aria-label={t("monthDiscs", { month: name, count: month.discs.length })}>
                  {month.discs.map((disc) => (
                    <li key={disc.id} className="relative">
                      <Link href={albumHref(disc.artistName, disc.title, disc.id)} title={disc.artistName ? `${disc.title} · ${disc.artistName}` : disc.title} className="block size-14 rounded transition-opacity hover:opacity-80">
                        <CoverThumb cover={disc.coverThumbUrl} label={disc.title} className="size-14 rounded" />
                      </Link>
                      {data.isOwner ? <YearHideButton year={data.year} disc={disc} /> : null}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      {data.isOwner ? <YearHiddenList year={data.year} hidden={data.hidden} /> : null}

      {/* "Arma la tuya" (add-year-in-discs-phase3, ADR 0055): a tu año de ese mismo año; sin sesión, por el registro con la intención `anio`. */}
      {data.isOwner ? null : (
        <LaminaCta
          intent={{ kind: "year", year: data.year }}
          signedInHref={session ? yearBuildHref(session.user.username, data.year) : null}
          title={t("cta.title", { year: data.year })}
          description={t("cta.description")}
        />
      )}
    </main>
  );
}

/** El año propio sin escuchas: explica de dónde sale y lleva al diario. */
function emptyOwnYear(t: Awaited<ReturnType<typeof getTranslations<"laminas.year">>>, username: string, year: number, inProgress: boolean) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <Link href={`/users/${encodeURIComponent(username)}`} className="font-data text-xs text-paper-muted hover:text-paper">
        @{username}
      </Link>
      <header className="flex flex-col gap-1">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t("kicker")}</p>
        <h1 className="font-display text-3xl text-paper">{inProgress ? t("titleInProgress", { year }) : t("title", { year })}</h1>
      </header>
      <section className="flex flex-col items-start gap-3 rounded border border-ink-border bg-ink-surface p-6">
        <h2 className="font-display text-lg text-paper">{t("empty.title", { year })}</h2>
        <p className="max-w-prose font-body text-sm text-paper-muted">{t("empty.body")}</p>
        <Link href="/me/diary" className="inline-flex min-h-11 items-center rounded bg-amber px-4 py-2 font-display text-sm text-ink transition-colors hover:bg-amber-hover">
          {t("empty.action")}
        </Link>
      </section>
    </main>
  );
}

export default withClientMessages("users/[username]/year/[year]/page", UserYearPage);
