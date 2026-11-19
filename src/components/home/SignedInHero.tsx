import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { EmailVerificationNotice } from "@/components/auth/EmailVerificationNotice";
import { HERO_WALL, heroWallTilePosition } from "@/lib/config/hero-covers";
import { Greeting } from "./Greeting";
import { greetingKey } from "./greeting-key";
import { HomeLogField } from "./HomeLogField";
import { LastTouchCard, type LastTouch, type OwnRating } from "./LastTouchCard";
import { QuickLinks } from "./QuickLinks";
import { HeroBackdrop } from "./HeroBackdrop";
import type { HomeBackdropAlbum } from "@/services/home/home";

/** Carátulas del mosaico para la cuenta sin actividad: la segunda fila, la más reconocible. */
const WELCOME_TILES = [8, 9, 10, 11, 12, 13, 14, 15] as const;

interface SignedInHeroProps {
  name: string;
  username: string;
  /** Entrada de «Última vez»; `null` = cuenta sin actividad (variante de bienvenida). */
  lastTouch: LastTouch | null;
  ownRating: OwnRating | null;
  onboardingPending: boolean;
  emailVerified: boolean;
  /** Álbumes de la persona para el fondo (personalize-signed-in-hero-backdrop); pocos = mosaico general. */
  backdropAlbums?: readonly HomeBackdropAlbum[];
  // Inyectable para test; en producción siempre es "ahora".
  now?: Date;
}

// Cabecera del Inicio con sesión (openspec: redesign-signed-in-home-phase1, dirección «C ·
// Continuidad» con el campo de «B · Diario primero»): franja a sangre completa con el mosaico de la
// portada de fondo y, en el contenedor ancho, el saludo como antetítulo, «¿Qué escuchaste hoy?» con
// el campo de registro y los accesos en mosaicos; a la derecha, «Última vez». Para una cuenta sin
// actividad, la misma cabecera da la bienvenida, explica el Inicio y deja dos caminos en prosa. El
// aviso de email pendiente es una línea dentro de la cabecera. Ver docs/05-features/home.md.
export async function SignedInHero({
  name,
  username,
  lastTouch,
  ownRating,
  onboardingPending,
  emailVerified,
  backdropAlbums = [],
  now = new Date(),
}: SignedInHeroProps) {
  const t = await getTranslations("home");
  const isNew = lastTouch === null;
  const profileLink = (
    <Link
      href={`/users/${encodeURIComponent(username)}`}
      className="min-w-0 truncate rounded-sm text-amber transition-colors hover:text-amber-hover"
    >
      {name}
    </Link>
  );

  return (
    // Banda a sangre completa, como el hero sin sesión: rompe el `px-4` y el `py-12` del `main`.
    <section
      aria-labelledby="home-hero-title"
      className="relative -mx-[calc(50vw-50%)] -mt-12 w-screen max-w-none overflow-hidden border-b border-ink-border"
    >
      <HeroBackdrop albums={backdropAlbums} />

      <div className="relative mx-auto grid w-full max-w-[88rem] gap-8 px-4 py-9 sm:px-8 sm:py-11 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:px-12">
        <div className="flex min-w-0 flex-col">
          <p className="flex min-w-0 items-baseline whitespace-nowrap font-data text-sm text-paper-muted">
            {isNew ? (
              <span>{t("welcomeEyebrow")}</span>
            ) : (
              <Greeting
                initialKey={greetingKey(now)}
                morning={t("greetingMorning")}
                afternoon={t("greetingAfternoon")}
                evening={t("greetingEvening")}
              />
            )}
            <span className="mr-[0.4em]">,</span>
            {profileLink}
          </p>
          <h1
            id="home-hero-title"
            className="mt-2 text-balance font-display text-[clamp(2.125rem,4vw,3.75rem)] font-bold leading-[1] tracking-[-0.03em] text-paper"
          >
            {t("heroTitle")}
          </h1>

          <div className="mt-5">
            <HomeLogField labelledBy="home-hero-title" />
          </div>
          <p className="mt-2.5 max-w-[60ch] font-data text-[0.8125rem] leading-relaxed text-paper-muted">
            {isNew ? t("welcomeHint") : t("logFieldHint")}
          </p>

          {isNew ? (
            <p className="mt-4 font-body text-base text-paper-muted">
              {t("welcomeAlso")}{" "}
              <Link href="/users" className="text-amber underline decoration-amber/30 underline-offset-4 hover:text-amber-hover">
                {t("welcomeFindPeople")}
              </Link>
              {onboardingPending ? (
                <>
                  {" "}
                  {t("welcomeOr")}{" "}
                  <Link href="/welcome" className="text-amber underline decoration-amber/30 underline-offset-4 hover:text-amber-hover">
                    {t("welcomeCompleteProfile")}
                  </Link>
                </>
              ) : null}
              .
            </p>
          ) : null}

          {!emailVerified ? (
            <div className="mt-3">
              <EmailVerificationNotice verified={false} variant="inline" />
            </div>
          ) : null}

          <div className="mt-6">
            <QuickLinks />
          </div>
        </div>

        {lastTouch ? (
          <LastTouchCard entry={lastTouch} rating={ownRating} />
        ) : (
          <div aria-hidden className="hidden -rotate-3 grid-cols-4 gap-2.5 self-center lg:grid">
            {WELCOME_TILES.map((index) => (
              <span
                key={index}
                className="block aspect-square rounded-lg bg-ink-surface shadow-[0_16px_30px_-16px_rgba(0,0,0,0.9)]"
                style={{
                  backgroundImage: `url(${HERO_WALL.src})`,
                  backgroundSize: `${HERO_WALL.cols * 100}% ${HERO_WALL.rows * 100}%`,
                  backgroundPosition: heroWallTilePosition(index),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
