import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { AuthUser } from "@/lib/api/schemas";
import { CONTACT_EMAIL, DATA_SOURCE_URLS, SOCIAL_LINKS } from "@/lib/site-links";
import { Logo } from "./Logo";

interface FooterProps {
  user?: Pick<AuthUser, "id" | "username" | "displayName"> | null;
}

// Pie de página global. Server Component: no necesita estado ni interactividad
// (el selector de idioma vive solo en el Header; "volver arriba" es un ancla).
// La variante logueado/anónimo se resuelve con el mismo `user` que recibe el
// Header, sin una segunda consulta de sesión.
export async function Footer({ user = null }: FooterProps) {
  const t = await getTranslations("footer");
  const tCommon = await getTranslations("common");
  const appName = tCommon("appName");
  const year = String(new Date().getFullYear());

  return (
    <footer className="w-full overflow-x-clip border-t border-ink-border bg-ink px-4 py-12 font-data text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr]">
          {/* Identidad */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-display text-base font-bold text-paper">
                {appName}
              </span>
            </div>
            <p className="font-body text-paper-muted">{tCommon("tagline")}</p>
            <p className="max-w-xs font-body text-xs text-paper-muted">
              {t("mission")}
            </p>
          </div>

          {/* Explorar */}
          <FooterNav label={t("explore.label")}>
            <FooterLink href="/">{t("explore.home")}</FooterLink>
            <FooterLink href="/search">{t("explore.search")}</FooterLink>
            <FooterLink href="/users">{t("explore.people")}</FooterLink>
            <FooterLink href="/about">{t("explore.howItWorks")}</FooterLink>
          </FooterNav>

          {/* Cuenta */}
          <FooterNav label={t("account.label")}>
            {user ? (
              <>
                <FooterLink href={`/users/${encodeURIComponent(user.username)}`}>
                  {t("account.profile")}
                </FooterLink>
                <FooterLink href="/me/diary">{t("account.diary")}</FooterLink>
                <FooterLink href="/me/settings">{t("account.settings")}</FooterLink>
              </>
            ) : (
              <>
                <FooterLink href="/auth/login">{t("account.login")}</FooterLink>
                <FooterLink href="/auth/register">
                  {t("account.register")}
                </FooterLink>
              </>
            )}
          </FooterNav>

          {/* Recursos + Conectar */}
          <div className="flex flex-col gap-8">
            <FooterNav label={t("resources.label")}>
              <FooterLink href="/about">{t("resources.about")}</FooterLink>
              <FooterLink href="/help">{t("resources.help")}</FooterLink>
            </FooterNav>

            <nav aria-label={t("connect.label")} className="flex flex-col gap-2">
              <h2 className="font-display text-xs font-bold uppercase tracking-wide text-paper">
                {t("connect.label")}
              </h2>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-paper-muted transition-colors hover:text-paper"
              >
                {t("connect.contact")}: {CONTACT_EMAIL}
              </a>
              <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer me"
                      aria-label={`${t(`connect.social.${link.id}`)} (${t("newTab")})`}
                      className="text-paper-muted transition-colors hover:text-amber"
                    >
                      {t(`connect.social.${link.id}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bloque de atribución de fuentes de datos */}
        <section
          aria-label={t("attribution.label")}
          className="flex flex-col gap-2 border-t border-ink-border pt-6 font-body text-sm text-paper-muted"
        >
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-paper">
            {t("attribution.label")}
          </h2>
          <p>
            {t("attribution.metadata.before")}{" "}
            <ExternalLink
              href={DATA_SOURCE_URLS.musicbrainz}
              newTabLabel={t("newTab")}
            >
              MusicBrainz
            </ExternalLink>
            {t("attribution.metadata.after")}
          </p>
          <p>
            {t("attribution.coverArt.before")}{" "}
            <ExternalLink
              href={DATA_SOURCE_URLS.coverArtArchive}
              newTabLabel={t("newTab")}
            >
              Cover Art Archive
            </ExternalLink>
            {t("attribution.coverArt.after")}
          </p>
          <p>
            {t("attribution.operator.before")}{" "}
            <ExternalLink
              href={DATA_SOURCE_URLS.metabrainz}
              newTabLabel={t("newTab")}
            >
              MetaBrainz Foundation
            </ExternalLink>
            {t("attribution.operator.after")}
          </p>
          <p>{t("attribution.noAffiliation", { appName })}</p>
          <p>{t("attribution.noAudio", { appName })}</p>
        </section>

        {/* Barra inferior */}
        <div className="flex flex-col gap-3 border-t border-ink-border pt-6 text-xs text-paper-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{t("bottom.copyright", { year, appName })}</p>
          <nav aria-label={t("bottom.label")}>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <FooterLink href="/terms">{t("bottom.terms")}</FooterLink>
              <FooterLink href="/privacy">{t("bottom.privacy")}</FooterLink>
              <FooterLink href="/cookies">{t("bottom.cookies")}</FooterLink>
              <FooterLink href="/guidelines">{t("bottom.guidelines")}</FooterLink>
            </ul>
          </nav>
          <a href="#top" className="transition-colors hover:text-paper">
            {t("backToTop")} ↑
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterNav({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <h2 className="font-display text-xs font-bold uppercase tracking-wide text-paper">
        {label}
      </h2>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </nav>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="text-paper-muted transition-colors hover:text-paper"
      >
        {children}
      </Link>
    </li>
  );
}

function ExternalLink({
  href,
  newTabLabel,
  children,
}: {
  href: string;
  newTabLabel: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-paper underline decoration-ink-border underline-offset-2 transition-colors hover:text-amber"
    >
      {children}
      <span className="sr-only"> ({newTabLabel})</span>
    </a>
  );
}
