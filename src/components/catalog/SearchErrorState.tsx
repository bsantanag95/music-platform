"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ErrorState } from "@/components/ui/ErrorState";

// La búsqueda solo falla cuando MusicBrainz no responde y no hay ninguna
// coincidencia local. `router.refresh()` vuelve a ejecutar el Server Component
// con el mismo `q` — es el reintento, sin recargar la página entera.
export function SearchErrorState() {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");
  const router = useRouter();

  return (
    <ErrorState
      title={t("INTERNAL_ERROR.title")}
      description={t("INTERNAL_ERROR.description")}
      onRetry={() => router.refresh()}
      retryLabel={tCommon("retry")}
    />
  );
}
