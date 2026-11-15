import { preload } from "react-dom";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { searchHref } from "@/components/catalog/search-types";
import { HERO_SEARCH_EXAMPLES, HERO_WALL } from "@/lib/config/hero-covers";
import { HeroCrate } from "./HeroCrate";
import { HeroSampleEntry } from "./HeroSampleEntry";

// Hero del Inicio para visitantes sin sesión (openspec: redesign-anon-home-phase1, dirección
// «C · Disquería»). Dos columnas desde `lg`: a la izquierda el titular de una sola idea, la
// bajada sobre fondo liso, el buscador del catálogo (el mismo componente que el del Header, en
// grande) con accesos de ejemplo y las acciones directas de registro e inicio de sesión; a la
// derecha la caja de carátulas en perspectiva con una entrada de ejemplo que enseña el doble
// puntaje. En móvil se apila. Ver docs/05-features/home.md.
export async function AnonHero() {
  const t = await getTranslations("home");
  // El mosaico es el fondo de la caja (background-image): sin un `<img>` que lleve
  // `fetchPriority`, se precarga para que no espere al CSS.
  preload(HERO_WALL.src, { as: "image", fetchPriority: "high" });

  return (
    // Banda a sangre completa: rompe el `px-4` y el ancho del `main` con un margen negativo
    // de medio viewport; el contenido vuelve a un contenedor ancho propio.
    <section
      aria-labelledby="home-hero-title"
      className="relative -mx-[calc(50vw-50%)] -mt-12 w-screen max-w-none overflow-hidden border-b border-ink-border"
    >
      <div className="mx-auto grid w-full max-w-[88rem] items-center gap-8 px-4 pb-10 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14 lg:py-20 xl:px-12">
        <div className="flex min-w-0 flex-col">
          <h1
            id="home-hero-title"
            className="text-balance font-display text-[clamp(2.25rem,4.2vw,4rem)] font-bold leading-[0.95] tracking-[-0.035em] text-paper"
          >
            <span className="block">{t("heroLine1")}</span>
            <span className="block text-amber">{t("heroLine2")}</span>
          </h1>
          <p className="mt-6 max-w-[38ch] font-body text-lg leading-relaxed text-paper-muted sm:text-xl">
            {t("anonSubtagline")}
          </p>

          <div className="mt-8 w-full max-w-xl">
            <HeaderSearch size="hero" />
          </div>
          <div className="mt-3.5 flex flex-wrap items-center gap-2 font-data text-xs text-paper-muted">
            <span>{t("heroTryLabel")}</span>
            {HERO_SEARCH_EXAMPLES.map((name) => (
              <Link
                key={name}
                href={searchHref("artist", name)}
                className="rounded-full border border-ink-border px-3 py-1.5 text-paper transition-colors hover:border-amber/70"
              >
                {name}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/auth/register"
              className="inline-flex h-12 items-center justify-center rounded-md border border-paper-muted/40 px-6 font-display text-base font-medium text-paper transition-colors hover:border-amber hover:text-amber"
            >
              {t("heroSignUp")}
            </Link>
            <p className="font-body text-sm text-paper-muted">
              {t("heroHaveAccount")}{" "}
              <Link
                href="/auth/login"
                className="text-paper underline decoration-ink-border underline-offset-4 transition-colors hover:decoration-amber"
              >
                {t("heroLogin")}
              </Link>
            </p>
          </div>
        </div>

        <div className="relative -mx-4 h-[19rem] sm:mx-0 sm:h-[24rem] lg:h-[clamp(28rem,42vw,38rem)]">
          <HeroCrate />
          <HeroSampleEntry />
        </div>
      </div>
    </section>
  );
}
