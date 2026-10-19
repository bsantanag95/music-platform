import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AppImage } from "@/components/ui/AppImage";
import { StickyJumpNav } from "@/components/awards/StickyJumpNav";
import { NomineeVisual } from "@/components/awards/NominationItem";
import { categoryName } from "@/components/awards/AwardCategory";
import { FacetRow } from "@/components/discovery/FacetRow";
import { AwardCategory } from "@/components/awards/AwardCategory";
import { awardHref, awardsIndexHref, categoryHistoryHref, ceremonyHref } from "@/components/awards/award-links";
import { sourceSite } from "@/components/awards/source-site";
import { splitFeatured } from "@/components/awards/featured-categories";
import { groupByField } from "@/components/awards/group-by-field";
import { AWARD_CATEGORY_TIERS } from "@/db/schema";
import { getCeremonyPage } from "@/services/awards/read";

// Página de una ceremonia cerrada (openspec: add-music-awards, design D5; redesign-awards-pages): campo general primero, luego
// por álbum y por género. Las cuatro categorías grandes van destacadas (ganador grande y todos los nominados); el resto, como
// filas compactas con los nominados plegados. Sin requests externos al renderizar.

interface CeremonyPageProps {
  params: Promise<{ locale: string; award: string; year: string }>;
}

async function load(params: CeremonyPageProps["params"]) {
  const { locale, award, year } = await params;
  const page = /^\d{4}$/.test(year) ? await getCeremonyPage(award, Number(year)) : null;
  return { locale, page };
}

export async function generateMetadata({ params }: CeremonyPageProps): Promise<Metadata> {
  const { page } = await load(params);
  if (!page) return {};
  const t = await getTranslations("awards");
  const award = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  return { title: t("ceremonyTitle", { award, year: page.ceremony.year }) };
}

export default async function CeremonyPage({ params }: CeremonyPageProps) {
  const { locale, page } = await load(params);
  if (!page) notFound();
  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");
  const award = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  const title = t("ceremonyTitle", { award, year: page.ceremony.year });
  const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${page.ceremony.heldOn}T00:00:00Z`),
  );
  const site = sourceSite(page.sourceUrl);
  // Orden de presentación (`AWARD_CATEGORY_TIERS`); un nivel sin categorías en esta ceremonia se omite.
  const labels = { general: t("tierGeneral"), album: t("tierAlbum"), genre: t("tierGenre") } as const;
  const tiers = AWARD_CATEGORY_TIERS.map((tier) => ({
    tier,
    label: labels[tier],
    categories: page.categories.filter((c) => c.tier === tier),
  })).filter(({ categories }) => categories.length > 0);

  // Navegación interna: los niveles general y por álbum y, en lugar del nivel por género, cada uno de sus campos.
  const jumpItems = tiers.flatMap(({ tier, label, categories }) =>
    tier === "genre"
      ? groupByField(categories)
          .filter((group) => group.field !== null)
          .map((group) => ({ id: `field-${group.field}`, label: t(`fields.${group.field}`) }))
      : [{ id: `tier-${tier}`, label }],
  );

  const category = (item: (typeof page.categories)[number], headingLevel: "h3" | "h4", variant: "featured" | "compact") => (
    <AwardCategory
      key={item.key}
      name={item.name}
      coverage={item.coverage}
      honors={item.honors}
      nominations={item.nominations}
      headingLevel={headingLevel}
      variant={variant}
      subjectKind={item.subjectKind}
      // En las tarjetas compactas, "Historial" a secas: el enlace largo, fijo a la derecha, apretaba el título a tres líneas.
      link={{
        href: categoryHistoryHref(page.awardSlug, item.key),
        label: variant === "compact" ? t("categoryHistoryShort") : t("categoryHistory"),
      }}
    />
  );
  // `items-start`: abrir los nominados de una fila no estira a la de al lado. Tres columnas desde `xl` salvo cuando dejarían
  // una tarjeta sola o un hueco (2 → 2 columnas, 4 → 2 × 2): un grupo de dos categorías dejaba la tercera columna vacía.
  const compactGrid = (count: number) =>
    `grid w-full grid-cols-1 items-start gap-3 lg:grid-cols-2 ${count === 2 || count === 4 ? "" : "xl:grid-cols-3"}`;

  // Portada: el ganador de la primera categoría destacada de álbum (en los Grammy, Álbum del año), con su carátula de fondo.
  const headline = page.categories
    .filter((item) => item.tier === "general" && item.subjectKind === "release_group")
    .map((item) => ({ item, winner: item.nominations.find((n) => n.won) }))
    .find((entry) => entry.winner?.subject?.kind === "release_group");
  const headlineAlbum = headline?.winner?.subject?.kind === "release_group" ? headline.winner.subject.album : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-10 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("heading"), href: awardsIndexHref() },
            { label: award, href: awardHref(page.awardSlug) },
            { label: String(page.ceremony.year) },
          ]}
        />
        <header className="relative isolate flex w-full flex-col-reverse gap-6 overflow-hidden rounded-xl border border-ink-border bg-ink-surface p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
          {headlineAlbum?.cover.coverThumbUrl ? (
            <span aria-hidden="true" className="absolute inset-0 -z-10">
              <AppImage
                src={headlineAlbum.cover.coverThumbUrl}
                alt=""
                fill
                sizes="1280px"
                className="scale-125 object-cover opacity-30 blur-3xl saturate-150"
              />
              <span className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-display text-4xl text-paper sm:text-5xl">{title}</h1>
            <p className="font-data text-sm text-paper-muted">
              {t("edition", { edition: page.ceremony.edition })} · {t("heldOn", { date })}
            </p>
            {page.voting || site ? (
              <p className="flex flex-wrap items-center gap-x-2 font-data text-xs text-paper-muted">
                {page.voting ? <span>{t(`voting.${page.voting}`)}</span> : null}
                {page.voting && site ? <span aria-hidden="true">·</span> : null}
                {site && page.sourceUrl ? (
                  <a
                    href={page.sourceUrl}
                    rel="noopener noreferrer"
                    className="underline-offset-2 transition-colors hover:text-amber hover:underline"
                  >
                    {t("source", { site })}
                  </a>
                ) : null}
              </p>
            ) : null}
          </div>
          {headline?.winner && headlineAlbum ? (
            <div className="flex items-center gap-4 md:max-w-[45%]">
              <NomineeVisual nomination={headline.winner} size="size-28 shrink-0 rounded-md shadow-[0_8px_30px_rgba(0,0,0,0.5)] sm:size-36" />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="inline-flex items-center gap-1 font-data text-[0.65rem] font-semibold uppercase tracking-wider text-amber">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="size-3"
                  >
                    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
                  </svg>
                  {categoryName(headline.item.name, locale)}
                </span>
                <span className="line-clamp-2 font-display text-xl text-paper">{headlineAlbum.title}</span>
                {headlineAlbum.artistName ? (
                  <span className="truncate font-data text-xs text-paper-muted">{headlineAlbum.artistName}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </header>

        {page.ceremonies.length > 1 ? (
          <FacetRow
            scroll
            facet={{
              label: t("yearRow"),
              links: page.ceremonies.map((ceremony) => ({
                key: String(ceremony.year),
                label: String(ceremony.year),
                href: ceremonyHref(page.awardSlug, ceremony.year),
                current: ceremony.year === page.ceremony.year,
              })),
            }}
          />
        ) : null}
      </div>

      {/* Fija bajo la cabecera del sitio al bajar: hija directa de `main`, que es el contenedor largo. */}
      <StickyJumpNav label={t("jumpLabel")} items={jumpItems} />

      {tiers.map(({ tier, label, categories }) => (
        <section key={tier} id={`tier-${tier}`} aria-labelledby={`tier-${tier}-title`} className="flex w-full scroll-mt-32 flex-col gap-4">
          <h2 id={`tier-${tier}-title`} className="font-display text-2xl text-paper">
            {label}
          </h2>
          {tier === "general" ? (
            (() => {
              const { featured, rest } = splitFeatured(categories);
              return (
                <>
                  <div className="grid w-full grid-cols-1 gap-4">{featured.map((item) => category(item, "h3", "featured"))}</div>
                  {rest.length > 0 ? <div className={compactGrid(rest.length)}>{rest.map((item) => category(item, "h3", "compact"))}</div> : null}
                </>
              );
            })()
          ) : tier === "genre" ? (
            groupByField(categories).map((group) => (
              <div key={group.field ?? "none"} className="flex flex-col gap-3">
                {group.field ? (
                  <h3 id={`field-${group.field}`} className="scroll-mt-32 font-display text-xl text-paper">
                    {t(`fields.${group.field}`)}
                  </h3>
                ) : null}
                <div className={compactGrid(group.items.length)}>{group.items.map((item) => category(item, "h4", "compact"))}</div>
              </div>
            ))
          ) : (
            <div className={compactGrid(categories.length)}>{categories.map((item) => category(item, "h3", "compact"))}</div>
          )}
        </section>
      ))}
    </main>
  );
}
