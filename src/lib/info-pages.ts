import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { InfoPageViewProps, InfoSection } from "@/components/legal/InfoPageView";
import { CONTACT_EMAIL, COVER_TAKEDOWN_EMAIL } from "@/lib/site-links";

// Páginas informativas y legales de la aplicación. Esta es la fuente única de verdad de CUÁLES
// existen, dónde viven y en qué estado están; el texto vive en `messages/{es,en}/info.json` y
// `messages/{es,en}/legal.json`. Mapa de qué cambio de código obliga a tocar qué texto:
// `docs/05-features/info-pages.md`.

export type InfoPageId =
  | "about"
  | "help"
  | "dataSources"
  | "terms"
  | "privacy"
  | "cookies"
  | "guidelines";

interface InfoPageMeta {
  /** Namespace de `messages/` donde vive su texto. */
  namespace: "info" | "legal";
  /** Ruta sin prefijo de idioma. */
  path: string;
  /**
   * Fecha (ISO, `YYYY-MM-DD`) de su última modificación de contenido. Quien cambie el texto de una
   * página, por poco que sea, actualiza también esta fecha: es la que ve la persona al pie.
   */
  updated: string;
  /**
   * `true` mientras el documento no haya pasado por revisión legal: muestra el aviso de "pendiente
   * de revisión" y pide a los buscadores no indexarlo. Al terminar la revisión se pasa a `false`
   * (y se quita de la lista de puntos por definir de la propia página).
   */
  pendingLegalReview: boolean;
}

export const INFO_PAGES: Record<InfoPageId, InfoPageMeta> = {
  about: { namespace: "info", path: "/about", updated: "2026-11-14", pendingLegalReview: false },
  help: { namespace: "info", path: "/help", updated: "2026-11-14", pendingLegalReview: false },
  dataSources: {
    namespace: "info",
    path: "/about/data-sources",
    updated: "2026-11-14",
    pendingLegalReview: false,
  },
  terms: { namespace: "legal", path: "/terms", updated: "2026-11-14", pendingLegalReview: true },
  privacy: { namespace: "legal", path: "/privacy", updated: "2026-11-14", pendingLegalReview: true },
  cookies: { namespace: "legal", path: "/cookies", updated: "2026-11-14", pendingLegalReview: true },
  guidelines: {
    namespace: "legal",
    path: "/guidelines",
    updated: "2026-11-14",
    pendingLegalReview: false,
  },
};

/** Orden en que se enlazan entre sí al pie de cada página. */
export const INFO_PAGE_ORDER: readonly InfoPageId[] = [
  "about",
  "help",
  "dataSources",
  "guidelines",
  "terms",
  "privacy",
  "cookies",
];

interface InfoPageContent {
  title: string;
  lead: string;
  sections: InfoSection[];
}

type Replacements = Record<string, string>;

// Sustituye `{appName}`, `{contactEmail}` y `{takedownContact}` en todo el contenido: el nombre del
// producto es provisional y los correos son configuración (`site-links`), así que no se escriben a
// mano en los textos.
function expand<T>(value: T, replacements: Replacements): T {
  if (typeof value === "string") {
    return value.replace(/\{(\w+)\}/g, (whole, key: string) => replacements[key] ?? whole) as T;
  }
  if (Array.isArray(value)) return value.map((item) => expand(item, replacements)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, expand(item, replacements)]),
    ) as T;
  }
  return value;
}

async function loadContent(id: InfoPageId): Promise<InfoPageContent> {
  const { namespace } = INFO_PAGES[id];
  const t = await getTranslations(namespace);
  const tCommon = await getTranslations("common");
  return expand(t.raw(id) as InfoPageContent, {
    appName: tCommon("appName"),
    contactEmail: CONTACT_EMAIL,
    // Contacto de retiro de carátulas: el configurado para el espejo (ADR 0018) o, sin él, el general.
    takedownContact: COVER_TAKEDOWN_EMAIL ?? CONTACT_EMAIL,
  });
}

export async function infoPageProps(id: InfoPageId): Promise<InfoPageViewProps> {
  const meta = INFO_PAGES[id];
  const [content, tUi, locale] = await Promise.all([
    loadContent(id),
    getTranslations("info"),
    getLocale(),
  ]);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${meta.updated}T00:00:00Z`),
  );

  return {
    title: content.title,
    lead: content.lead,
    notice: meta.pendingLegalReview ? tUi("ui.pendingNotice") : undefined,
    sections: content.sections,
    lastUpdated: tUi("ui.lastUpdated", { date }),
    tocLabel: tUi("ui.toc"),
    relatedLabel: tUi("ui.related"),
    related: INFO_PAGE_ORDER.filter((other) => other !== id).map((other) => ({
      href: INFO_PAGES[other].path,
      label: tUi(`pages.${other}`),
    })),
    newTabLabel: tUi("ui.newTab"),
  };
}

// Título propio + nombre de la app. Los documentos sin revisión legal se piden fuera de los buscadores
// (no exponer políticas no vigentes); el resto sí se indexa.
export async function infoMetadata(id: InfoPageId): Promise<Metadata> {
  const meta = INFO_PAGES[id];
  const [content, tCommon] = await Promise.all([loadContent(id), getTranslations("common")]);
  return {
    title: `${content.title} · ${tCommon("appName")}`,
    description: content.lead.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"),
    ...(meta.pendingLegalReview ? { robots: { index: false, follow: false } } : {}),
  };
}
