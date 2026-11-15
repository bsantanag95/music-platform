"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_MONOGRAM } from "@/lib/share/brand-tokens";

// Placeholder genérico mientras no exista un logo oficial del sitio — un
// monograma simple. Reemplazar el contenido visual de este componente (no su
// rol: link a "/") cuando haya un logo real. El glifo lo comparte la firma de
// las imágenes de compartir (BRAND_MONOGRAM).
//
// `withName` (Header, openspec: redesign-site-header): suma el nombre de la
// aplicación (`common.appName`) junto al monograma desde `sm`; como el nombre es
// provisional, vive en un solo mensaje. El pie no lo usa: ya muestra el nombre
// al lado.
export function Logo({ withName = false }: { withName?: boolean }) {
  const t = useTranslations("common");
  const appName = t("appName");

  const mark = (
    <span
      aria-hidden={withName ? true : undefined}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-ink transition-colors group-hover:bg-amber-hover"
    >
      {BRAND_MONOGRAM}
    </span>
  );

  if (!withName) {
    return (
      <Link href="/" aria-label={t("home")} className="group flex shrink-0">
        {mark}
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label={`${appName} — ${t("home")}`}
      className="group flex shrink-0 items-center gap-2.5 rounded-md"
    >
      {mark}
      {/* Entre `lg` y `xl` la fila del Header no tiene margen (con sesión desbordaba a 1024 px,
          medido): ahí el nombre cede su sitio al buscador y queda solo el monograma. */}
      <span
        aria-hidden="true"
        className="hidden whitespace-nowrap font-display text-lg font-bold tracking-[-0.01em] text-paper sm:inline lg:hidden xl:inline"
      >
        {appName}
      </span>
    </Link>
  );
}
