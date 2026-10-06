import { getTranslations } from "next-intl/server";
import { HeroCoverWall } from "./HeroCoverWall";
import { GetStartedModal } from "./GetStartedModal";

// Hero del Inicio para visitantes sin sesión: primera impresión visual (mosaico fijo
// de carátulas que se difumina hacia el ink de la página), titular en tres
// líneas y un único CTA "Comenzá" que abre el modal de registro/login. La
// búsqueda del catálogo vive en el Header (`HeaderSearch`), presente en todos
// los estados — ver docs/05-features/home.md.
export async function AnonHero() {
  const t = await getTranslations("home");

  return (
    // Banda a sangre completa: rompe el `px-4` y el ancho del `main` con un
    // margen negativo de medio viewport, sin bordes ni esquinas.
    <div className="relative -mx-[calc(50vw-50%)] flex w-screen max-w-none items-center justify-center overflow-hidden sm:min-h-[min(45.45vw,52rem)]">
      <HeroCoverWall />
      {/* Degradado de legibilidad: ink sólido arriba, más transparente en el
          centro para dejar ver las carátulas. Abajo solo cierra sobre el 12%
          final: la fila inferior del muro conserva limpia su mitad superior
          (el alto mínimo de arriba, 2,2:1, hace que el mosaico se recorte poco). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--color-ink)_0%,color-mix(in_srgb,var(--color-ink)_55%,transparent)_30%,color-mix(in_srgb,var(--color-ink)_55%,transparent)_88%,var(--color-ink)_100%)]"
      />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-36">
        <h1 className="text-balance font-display text-2xl leading-tight text-paper sm:text-4xl">
          <span className="block">{t("heroLine1")}</span>
          <span className="block">{t("heroLine2")}</span>
          <span className="block">{t("heroLine3")}</span>
        </h1>
        <p className="max-w-md font-body text-sm text-paper-muted">
          {t("anonSubtagline")}
        </p>
        <GetStartedModal />
      </div>
    </div>
  );
}
