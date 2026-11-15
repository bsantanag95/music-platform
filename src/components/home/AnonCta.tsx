import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HERO_WALL } from "@/lib/config/hero-covers";

// Cierre de la portada sin sesión (openspec: redesign-anon-home-phase3): un panel con el mosaico de
// carátulas de fondo, atenuado y enmascarado hacia la izquierda para que el texto quede sobre liso; el
// título, una línea y dos salidas: crear cuenta (directo, sin diálogo) y, si el descubrimiento está
// habilitado, explorar el catálogo. Antes era un `<Button>` dentro de un `<Link>` (interactivo anidado).
export async function AnonCta({ exploreEnabled = false }: { exploreEnabled?: boolean }) {
  const t = await getTranslations("home");

  return (
    <section
      aria-labelledby="home-closing"
      className="relative isolate overflow-hidden rounded-2xl border border-ink-border bg-ink-surface px-6 py-14 sm:px-10 lg:px-16 lg:py-20"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-cover bg-center opacity-20 [mask-image:linear-gradient(90deg,transparent_15%,#000_85%)] [-webkit-mask-image:linear-gradient(90deg,transparent_15%,#000_85%)]"
        style={{ backgroundImage: `url(${HERO_WALL.src})` }}
      />
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_auto] lg:gap-12">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2
            id="home-closing"
            className="text-balance font-display text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1] tracking-[-0.03em] text-paper"
          >
            {t("anonClosingTitle")}
          </h2>
          <p className="max-w-[44ch] font-body text-lg text-paper-muted">{t("anonClosingBody")}</p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link
            href="/auth/register"
            className="inline-flex h-12 items-center justify-center rounded-md bg-amber px-6 font-display text-base font-medium text-ink transition-colors hover:bg-amber-hover"
          >
            {t("heroSignUp")}
          </Link>
          {exploreEnabled ? (
            <Link
              href="/explore"
              className="inline-flex h-12 items-center justify-center rounded-md border border-paper-muted/40 px-6 font-display text-base font-medium text-paper transition-colors hover:border-amber hover:text-amber"
            >
              {t("closingExplore")}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
