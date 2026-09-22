import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export type LegalSection =
  | "about"
  | "terms"
  | "privacy"
  | "cookies"
  | "guidelines";

export interface LegalContentSection {
  id: string;
  title: string;
  paragraphs: string[];
  /** Lista de puntos (p. ej. lo que todavía está por definir). */
  items?: string[];
}

interface LegalPageViewProps {
  title: string;
  body: string;
  /** Bajada bajo el cuerpo, para las páginas que ya describen partes de la política. */
  intro?: string;
  sections?: LegalContentSection[];
  /** Aviso de "no vinculante" — ausente en "Acerca de", que no es una política. */
  notice?: string;
  lastUpdated: string;
}

// Componente presentacional (sin i18n propio, per convención de `components/`):
// recibe texto ya traducido. Las páginas de políticas comparten esta estructura.
export function LegalPageView({
  title,
  body,
  intro,
  sections,
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
      {intro ? <p className="font-body text-paper-muted">{intro}</p> : null}
      {sections?.map((section) => (
        <section key={section.id} aria-labelledby={`legal-${section.id}`} className="flex flex-col gap-3">
          <h2 id={`legal-${section.id}`} className="font-display text-lg text-paper">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className="font-body text-paper-muted">
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <ul className="flex list-disc flex-col gap-2 pl-5 font-body text-paper-muted">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <p className="font-data text-xs text-paper-muted">{lastUpdated}</p>
    </main>
  );
}

type LegalTranslator = Awaited<ReturnType<typeof getTranslations<"legal">>>;

// Datos personales y cuenta (cambios profile-personal-info y rework-account-settings,
// Fase 3): lo que la aplicación guarda de forma opcional en el perfil, lo que hace hoy al
// desactivar, reactivar, eliminar y exportar, y lo que queda por definir antes de la
// apertura. Las claves son fijas: cada sección lleva sus párrafos y, la última, una lista.
const PRIVACY_SECTIONS = [
  { id: "personal", paragraphs: ["body", "body2", "body3"] },
  { id: "deactivate", paragraphs: ["body", "body2"] },
  { id: "reactivate", paragraphs: ["body"] },
  { id: "delete", paragraphs: ["body", "body2"] },
  { id: "export", paragraphs: ["body"] },
  { id: "limits", paragraphs: ["body"] },
  { id: "pending", paragraphs: ["body"], items: 8 },
] as const;

function privacySections(t: LegalTranslator): LegalContentSection[] {
  return PRIVACY_SECTIONS.map((section) => ({
    id: section.id,
    title: t(`privacy.sections.${section.id}.title`),
    paragraphs: section.paragraphs.map((key) => t(`privacy.sections.${section.id}.${key}`)),
    ...("items" in section
      ? {
          items: Array.from({ length: section.items }, (_, index) =>
            t(`privacy.sections.${section.id}.items.${index}`),
          ),
        }
      : {}),
  }));
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
    ...(section === "privacy"
      ? { intro: t("privacy.intro"), sections: privacySections(t) }
      : {}),
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
