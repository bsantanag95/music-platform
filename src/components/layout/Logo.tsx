"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BRAND_MONOGRAM } from "@/lib/share/brand-tokens";

// Placeholder genérico mientras no exista un logo oficial del sitio — un
// monograma simple, no texto de marca. Reemplazar el contenido visual de
// este componente (no su rol: link a "/") cuando haya un logo real. El glifo lo
// comparte la firma de las imágenes de compartir (BRAND_MONOGRAM).
export function Logo() {
  const t = useTranslations("common");

  return (
    <Link
      href="/"
      aria-label={t("home")}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-ink transition-colors hover:bg-amber-hover"
    >
      {BRAND_MONOGRAM}
    </Link>
  );
}
