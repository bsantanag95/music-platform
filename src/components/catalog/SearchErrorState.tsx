"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ErrorState } from "@/components/ui/ErrorState";

// La búsqueda solo falla cuando MusicBrainz no responde y no hay ninguna
// coincidencia local. `router.refresh()` vuelve a ejecutar el Server Component
// con el mismo `q` — es el reintento, sin recargar la página entera. Con la
// consulta, dice qué falló en lugar del error genérico (openspec:
// refine-search-results-phase1).
export function SearchErrorState({ query }: { query?: string }) {
  const t = useTranslations("errors");
  const tSearch = useTranslations("catalog.search.results");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <ErrorState
      title={query ? tSearch("errorTitle") : t("INTERNAL_ERROR.title")}
      description={query ? tSearch("errorDescription", { query }) : t("INTERNAL_ERROR.description")}
      onRetry={() => router.refresh()}
      retryLabel={tCommon("retry")}
    />
  );
}
