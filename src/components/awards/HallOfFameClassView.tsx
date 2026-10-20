import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AppImage } from "@/components/ui/AppImage";
import { FacetRow } from "@/components/discovery/FacetRow";
import { albumHref } from "@/lib/catalog-links";
import type { CeremonyPage, NominationView } from "@/services/awards/read";
import { categoryName } from "./AwardCategory";
import { hallClassHref, hallHref, hallOfFameIndexHref } from "./award-links";
import { coverUrl, tileCovers } from "./HallOfFameTile";
import { NominationItem, NomineeVisual, subjectHref, titleAndArtist } from "./NominationItem";
import { sourceSite } from "./source-site";

// Ceremonia de un salón de la fama (openspec: add-grammy-hall-of-fame, design D5; ADR 0044; polish-hall-of-fame-class): "Clase de
// 2026", con la fecha de la gala y las incorporaciones por categoría. A diferencia de una competencia no hay número de edición,
// ganador entre nominados ni historia de la categoría. Los nominados que no entraron, si el salón los publica, van aparte; el Grammy
// Hall of Fame no tiene.
//
// Las incorporaciones son un muro de carátulas (como la vista de una colección): en filas de carátula chica, un título de dos líneas
// o el "del disco …" descuadraban la fila respecto de las vecinas. Sin carátula llevan la portada tipográfica. No llevan "Ingresó":
// en esta página ingresaron todas, y el rótulo en ámbar se repetía 25 veces. La cabecera lleva el fondo teñido y un mosaico de la
// clase, y el desglose por categoría enlaza a cada sección.

/** Compara títulos sin mayúsculas, acentos ni signos: "Cocktails for Two" y "Cocktails For Two" son el mismo. */
function sameTitle(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase()
      .replace(/[^\p{L}\p{N}]/gu, "");
  return norm(a) === norm(b);
}

/** Disco donde aparece una canción, solo si se llama distinto de ella (si no, "del disco …" repite el título). */
export function distinctAnchor(nomination: NominationView) {
  const subject = nomination.subject;
  if (subject?.kind !== "recording" || !subject.anchor) return null;
  return sameTitle(subject.title, subject.anchor.title) ? null : subject.anchor;
}

const MOSAIC = 4;

function InducteeCard({ nomination }: { nomination: NominationView }) {
  const t = useTranslations("awards");
  const { title, artist } = titleAndArtist(nomination);
  const href = subjectHref(nomination);
  const anchor = distinctAnchor(nomination);
  const visual = <NomineeVisual nomination={nomination} size="aspect-square w-full" typeCover />;
  const titleText = <span className="line-clamp-2 font-display text-sm text-paper transition-colors group-hover:text-amber">{title}</span>;

  return (
    <li className="flex min-w-0 flex-col gap-1.5">
      {href ? (
        <Link href={href} className="group flex flex-col gap-1.5">
          {visual}
          {titleText}
        </Link>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visual}
          {titleText}
        </div>
      )}
      {artist ? <span className="truncate font-data text-xs text-paper-muted">{artist}</span> : null}
      {anchor ? (
        <Link
          href={albumHref(anchor.artistName, anchor.title, anchor.id)}
          className="truncate font-data text-[0.7rem] text-paper-muted transition-colors hover:text-amber"
        >
          {t("fromAlbum", { album: anchor.title })}
        </Link>
      ) : null}
    </li>
  );
}

export function HallOfFameClassView({ page, awardName }: { page: CeremonyPage; awardName: string }) {
  const t = useTranslations("awards");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${page.ceremony.heldOn}T00:00:00Z`),
  );
  const site = sourceSite(page.sourceUrl);
  const sections = page.categories.map((category) => ({
    category,
    id: `categoria-${category.key}`,
    inductees: category.nominations.filter((n) => n.won),
    others: category.nominations.filter((n) => !n.won),
  }));
  const allInductees = sections.flatMap((section) => section.inductees);
  const mosaic = tileCovers(allInductees, MOSAIC);
  const backdrop = mosaic.map(coverUrl).find((url): url is string => url !== null) ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("hall.pageHeading"), href: hallOfFameIndexHref() },
            { label: awardName, href: hallHref(page.awardSlug) },
            { label: t("hall.classTitle", { year: page.ceremony.year }) },
          ]}
        />
        <header className="relative isolate flex w-full items-center justify-between gap-6 overflow-hidden rounded-xl border border-ink-border bg-ink-surface p-5 sm:p-8">
          {backdrop ? (
            <span aria-hidden="true" className="absolute inset-0 -z-10">
              <AppImage src={backdrop} alt="" fill sizes="1280px" className="scale-125 object-cover opacity-25 blur-3xl saturate-150" />
              <span className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-4xl text-paper sm:text-5xl">{t("hall.classTitle", { year: page.ceremony.year })}</h1>
            <p className="font-body text-lg text-paper-muted">{awardName}</p>
            <p className="font-data text-sm text-paper-muted">
              {t("hall.recordingCount", { count: allInductees.length })} · {t("hall.date", { date })}
            </p>
            {page.voting || site ? (
              <p className="flex flex-wrap items-center gap-x-2 font-data text-xs text-paper-muted">
                {page.voting ? <span>{t(`votingHall.${page.voting}`)}</span> : null}
                {page.voting && site ? <span aria-hidden="true">·</span> : null}
                {site && page.sourceUrl ? (
                  <a href={page.sourceUrl} rel="noopener noreferrer" className="underline-offset-2 transition-colors hover:text-amber hover:underline">
                    {t("source", { site })}
                  </a>
                ) : null}
              </p>
            ) : null}
            {sections.length > 1 ? (
              <nav aria-label={t("jumpLabel")} className="mt-1 flex flex-wrap gap-1.5">
                {sections.map(({ category, id, inductees }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-border bg-ink/60 px-3 py-1 font-data text-xs text-paper-muted transition-colors hover:border-paper-muted/60 hover:text-paper focus-visible:border-amber"
                  >
                    {categoryName(category.name, locale)}
                    <span className="tabular-nums text-paper">{inductees.length}</span>
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
          {mosaic.length >= MOSAIC ? (
            <div aria-hidden="true" className="hidden shrink-0 grid-cols-2 gap-2 sm:grid">
              {mosaic.map((nomination) => (
                <span key={nomination.id} className="block size-20 overflow-hidden rounded-md shadow-[0_6px_20px_rgba(0,0,0,0.45)] lg:size-24">
                  <NomineeVisual nomination={nomination} size="size-full" typeCover />
                </span>
              ))}
            </div>
          ) : null}
        </header>

        {page.ceremonies.length > 1 ? (
          <FacetRow
            scroll
            facet={{
              label: t("hall.classYearRow"),
              links: page.ceremonies.map((ceremony) => ({
                key: String(ceremony.year),
                label: String(ceremony.year),
                href: hallClassHref(page.awardSlug, ceremony.year),
                current: ceremony.year === page.ceremony.year,
              })),
            }}
          />
        ) : null}
      </div>

      {sections.map(({ category, id, inductees, others }) => (
        <section key={category.key} id={id} aria-labelledby={`${id}-heading`} className="flex w-full scroll-mt-24 flex-col gap-4">
          <h2 id={`${id}-heading`} className="font-display text-2xl text-paper">
            {categoryName(category.name, locale)}
            <span className="ml-2 font-data text-sm text-paper-muted">{inductees.length}</span>
          </h2>
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {inductees.map((nomination) => (
              <InducteeCard key={nomination.id} nomination={nomination} />
            ))}
          </ul>
          {others.length > 0 ? (
            <ul className="grid w-full grid-cols-1 gap-x-6 gap-y-3 border-t border-ink-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((nomination) => (
                <li key={nomination.id} className="min-w-0">
                  <NominationItem nomination={nomination} size="sm" />
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </main>
  );
}
