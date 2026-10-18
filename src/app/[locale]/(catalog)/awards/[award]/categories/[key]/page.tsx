import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { AwardCategory, categoryName } from "@/components/awards/AwardCategory";
import { awardHref, awardsIndexHref, categoryHistoryHref, ceremonyHref } from "@/components/awards/award-links";
import { getCategoryHistory } from "@/services/awards/read";

// Historia de una categoría a través de las ceremonias (openspec: add-music-awards, design D5), con enlaces a la
// categoría anterior y a la siguiente cuando se renombró, fusionó o dividió.

interface CategoryHistoryProps {
  params: Promise<{ locale: string; award: string; key: string }>;
}

export async function generateMetadata({ params }: CategoryHistoryProps): Promise<Metadata> {
  const { locale, award, key } = await params;
  const page = await getCategoryHistory(award, key);
  if (!page) return {};
  return { title: categoryName(page.name, locale) };
}

export default async function CategoryHistoryPage({ params }: CategoryHistoryProps) {
  const { locale, award, key } = await params;
  const page = await getCategoryHistory(award, key);
  if (!page) notFound();
  const t = await getTranslations("awards");
  const tCommon = await getTranslations("common");
  const awardName = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  const name = categoryName(page.name, locale);
  const relation = (href: string, text: string) => (
    <Link href={href} className="font-data text-sm text-paper-muted underline-offset-2 transition-colors hover:text-amber hover:underline">
      {text}
    </Link>
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col items-start gap-8 px-4 py-12">
      <div className="flex w-full flex-col gap-6">
        <Breadcrumbs
          items={[
            { label: tCommon("home"), href: "/" },
            { label: t("heading"), href: awardsIndexHref() },
            { label: awardName, href: awardHref(page.awardSlug) },
            { label: name },
          ]}
        />
        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl text-paper">{name}</h1>
          {page.honors === "songwriter" ? <p className="font-data text-sm text-paper-muted">{t("songwriterNote")}</p> : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {page.predecessor
              ? relation(
                  categoryHistoryHref(page.awardSlug, page.predecessor.key),
                  t("previouslyNamed", { name: categoryName(page.predecessor.name, locale) }),
                )
              : null}
            {page.successors.map((successor) => (
              <span key={successor.key}>
                {relation(
                  categoryHistoryHref(page.awardSlug, successor.key),
                  t("laterNamed", { name: categoryName(successor.name, locale) }),
                )}
              </span>
            ))}
          </div>
        </header>
      </div>

      <div className="flex w-full flex-col gap-4">
        {page.entries.map((entry) => (
          <AwardCategory
            key={entry.ceremony.year}
            headingLevel="h2"
            heading={String(entry.ceremony.year)}
            name={page.name}
            coverage={entry.coverage}
            honors="performer"
            nominations={entry.nominations}
            link={{ href: ceremonyHref(page.awardSlug, entry.ceremony.year), label: t("ceremonyLink", { year: entry.ceremony.year }) }}
          />
        ))}
      </div>
    </main>
  );
}
