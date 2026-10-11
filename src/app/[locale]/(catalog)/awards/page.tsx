import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ceremonyHref } from "@/components/awards/award-links";
import { listAwards } from "@/services/awards/read";

// Índice de premios (openspec: add-music-awards, design D5): cada premio con sus ceremonias cargadas.

interface AwardsIndexProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AwardsIndexProps): Promise<Metadata> {
  await params;
  const t = await getTranslations("awards");
  return { title: t("pageTitle") };
}

export default async function AwardsIndexPage({ params }: AwardsIndexProps) {
  const { locale } = await params;
  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");
  const awards = await listAwards();
  const dateFormat = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs items={[{ label: tCommon("home"), href: "/" }, { label: t("heading") }]} />
        <header className="flex max-w-2xl flex-col gap-2">
          <p className="font-data text-xs uppercase tracking-wider text-amber">{t("kicker")}</p>
          <h1 className="font-display text-4xl text-paper">{t("heading")}</h1>
          <p className="font-body text-paper-muted">{t("intro")}</p>
        </header>
      </div>

      {awards.length === 0 ? <p className="font-body text-paper-muted">{t("emptyIndex")}</p> : null}

      {awards.map((award) => (
        <section key={award.slug} aria-labelledby={`award-${award.slug}`} className="flex w-full flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <h2 id={`award-${award.slug}`} className="font-display text-2xl text-paper">
              {t.has(`names.${award.slug}`) ? t(`names.${award.slug}`) : award.slug}
            </h2>
            <span className="font-data text-xs text-paper-muted">{t("ceremonyCount", { count: award.ceremonies.length })}</span>
          </div>
          <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {award.ceremonies.map((ceremony) => (
              <li key={ceremony.year}>
                <Link
                  href={ceremonyHref(award.slug, ceremony.year)}
                  className="flex h-full flex-col gap-1 rounded-lg border border-ink-border bg-ink-surface p-4 transition-colors hover:border-amber"
                >
                  <span className="font-display text-3xl text-paper">{ceremony.year}</span>
                  <span className="font-data text-xs text-paper-muted">{t("edition", { edition: ceremony.edition })}</span>
                  <span className="font-data text-xs text-paper-muted">{dateFormat.format(new Date(`${ceremony.heldOn}T00:00:00Z`))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
