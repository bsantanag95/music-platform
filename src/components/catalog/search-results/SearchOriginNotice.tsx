import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { searchHref } from "../search-types";

// Aviso en el perfil al que la búsqueda redirigió por coincidencia exacta
// única (estilo Metal Archives, openspec: redesign-scoped-search). Si no era
// ese artista, un clic vuelve a la lista con `all=1`, que no redirige.
export function SearchOriginNotice({ query }: { query: string }) {
  const t = useTranslations("catalog.search.origin");
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 font-data text-xs text-paper-muted">
      <span>{t("notThisOne")}</span>
      <Link
        href={searchHref("artist", query, { all: "1" })}
        className="text-amber underline-offset-2 transition-colors hover:text-amber-hover hover:underline"
      >
        {t("seeAll", { query })}
      </Link>
    </p>
  );
}
