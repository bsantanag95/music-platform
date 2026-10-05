import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { GENRE_FAMILIES, type FamilyKey } from "@/services/genres/families";

// Cabecera fija de la página de género (openspec: redesign-genre-page, capabilities `genre-pages` y
// `genre-page-overview`): migas con la familia, nombre, familias y, por slots, las cifras, el texto
// "Sobre el género" y las acciones de la persona. Los slots llegan resueltos por la página para que
// cada uno pueda cargarse tras un `<Suspense>` sin retrasar la cabecera.

interface GenreHeaderProps {
  name: string;
  families: FamilyKey[];
  stats?: ReactNode;
  actions?: ReactNode;
}

const CHIP =
  "inline-flex rounded-full border border-ink-border px-2.5 py-0.5 font-data text-xs text-paper-muted transition-colors hover:border-amber hover:text-paper";

/** Primera familia del género en el orden de la interfaz. */
export function primaryFamily(families: readonly FamilyKey[]): FamilyKey | null {
  return GENRE_FAMILIES.find((f) => families.includes(f.key))?.key ?? null;
}

export function GenreHeader({ name, families, stats, actions }: GenreHeaderProps) {
  const t = useTranslations("catalog.genres");
  const tPage = useTranslations("catalog.genres.page");
  const tExplore = useTranslations("catalog.explore");
  const tCommon = useTranslations("common");
  const family = primaryFamily(families);

  const crumbs = [
    { label: tCommon("home"), href: "/" },
    { label: tExplore("navLabel"), href: "/explore" },
    ...(family ? [{ label: t(`families.${family}`), href: `/explore?familia=${family}` }] : []),
    { label: name },
  ];

  return (
    <header className="flex w-full flex-col gap-3">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl text-paper [overflow-wrap:anywhere]">{name}</h1>
        {actions}
      </div>
      {families.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="font-data text-xs uppercase tracking-wide text-paper-muted">{tPage("familiesLabel")}</span>
          <ul className="flex flex-wrap gap-1.5">
            {families.map((key) => (
              <li key={key}>
                <Link href={`/explore?familia=${key}`} className={CHIP}>
                  {t(`families.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {stats}
    </header>
  );
}
