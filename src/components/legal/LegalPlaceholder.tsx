import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export type LegalSection =
  | "about"
  | "terms"
  | "privacy"
  | "cookies"
  | "guidelines";

interface LegalPageViewProps {
  title: string;
  body: string;
  /** Aviso de "no vinculante" — ausente en "Acerca de", que no es una política. */
  notice?: string;
  lastUpdated: string;
}

// Componente presentacional (sin i18n propio, per convención de `components/`):
// recibe texto ya traducido. Las páginas de políticas comparten esta estructura.
export function LegalPageView({
  title,
  body,
  notice,
  lastUpdated,
}: LegalPageViewProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-2xl text-paper">{title}</h1>
      <p className="font-body text-paper-muted">{body}</p>
      {notice ? (
        <p className="rounded-md border border-ink-border bg-ink-surface p-4 font-body text-sm text-paper-muted">
          {notice}
        </p>
      ) : null}
      <p className="font-data text-xs text-paper-muted">{lastUpdated}</p>
    </main>
  );
}

// Resuelve el texto del namespace `legal` para una sección.
export async function legalPageProps(
  section: LegalSection,
): Promise<LegalPageViewProps> {
  const t = await getTranslations("legal");

  return {
    title: t(`${section}.title`),
    body: t(`${section}.body`),
    notice: section === "about" ? undefined : t("placeholderNotice"),
    lastUpdated: t("lastUpdated"),
  };
}

// Metadata común: título propio + nombre de la app, y `noindex` mientras el
// contenido sea un marcador de posición (no exponer políticas no vigentes a los
// buscadores).
export async function legalMetadata(section: LegalSection): Promise<Metadata> {
  const t = await getTranslations("legal");
  const tCommon = await getTranslations("common");

  return {
    title: `${t(`${section}.title`)} · ${tCommon("appName")}`,
    robots: { index: false, follow: false },
  };
}
