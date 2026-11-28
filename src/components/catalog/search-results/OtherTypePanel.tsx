import { cache } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { findInOtherType } from "@/services/catalog/search/other-type";
import type { SearchType } from "@/services/catalog/search/types";
import { searchHref } from "../search-types";
import { OtherTypeRows } from "./OtherTypeRows";

// «x» en otros tipos, en la columna lateral de la búsqueda rápida (openspec: redesign-search-phase2, design D5). Solo de
// la base propia: ninguna solicitud a MusicBrainz. Se transmite en su propio `Suspense`; sin coincidencias, no se pinta.
// `ResultsLayout` pinta el panel dos veces (teléfono y columna fija): una sola consulta por petición.
const findCached = cache(findInOtherType);

export async function OtherTypePanel({ type, query }: { type: SearchType; query: string }) {
  const matches = await findCached(type, query);
  if (!matches) return null;
  const t = await getTranslations("catalog.search");
  const typeName = t(`types.${matches.type}`).toLowerCase();

  return (
    <section
      aria-labelledby={`other-type-${matches.type}`}
      className="flex flex-col gap-3 rounded-xl border border-ink-border bg-ink-surface/60 p-5"
    >
      <h3 id={`other-type-${matches.type}`} className="font-display text-base font-bold text-paper">
        {t("results.otherType.title", { query, type: typeName })}
      </h3>
      <OtherTypeRows matches={matches} />
      <Link
        href={searchHref(matches.type, query)}
        className="self-start font-data text-xs text-paper-muted transition-colors hover:text-amber"
      >
        {t("results.otherType.seeAll", { type: typeName })} <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
