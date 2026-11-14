import * as fs from "fs";
import * as path from "path";
import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";

import infoEs from "../../../messages/es/info.json";
import infoEn from "../../../messages/en/info.json";
import legalEs from "../../../messages/es/legal.json";
import legalEn from "../../../messages/en/legal.json";
import commonEs from "../../../messages/es/common.json";
import commonEn from "../../../messages/en/common.json";
import { CONTACT_EMAIL } from "@/lib/site-links";
import { INFO_PAGES, INFO_PAGE_ORDER, type InfoPageId } from "@/lib/info-pages";

// Páginas informativas y legales (openspec: add-info-and-legal-pages). Estos tests protegen la coherencia
// del conjunto: cada página renderiza, los dos idiomas dicen lo mismo, no hay enlaces internos rotos y lo
// que los textos afirman de las cookies sigue siendo lo que el código hace.

const messagesByLocale = {
  es: { info: infoEs, legal: legalEs, common: commonEs },
  en: { info: infoEn, legal: legalEn, common: commonEn },
} as const;

let activeLocale: "es" | "en" = "es";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) =>
    createTranslator({
      locale: activeLocale,
      messages: messagesByLocale[activeLocale],
      namespace,
    } as Parameters<typeof createTranslator>[0]),
  ),
  getLocale: vi.fn(async () => activeLocale),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

type PageModule = {
  default: () => Promise<ReactElement>;
  generateMetadata: () => Promise<{ title?: string; description?: string; robots?: unknown }>;
};

const PAGE_FILES: Record<InfoPageId, string> = {
  about: "./about/page",
  help: "./help/page",
  dataSources: "./about/data-sources/page",
  terms: "./terms/page",
  privacy: "./privacy/page",
  cookies: "./cookies/page",
  guidelines: "./guidelines/page",
};

const ids = Object.keys(INFO_PAGES) as InfoPageId[];
const LOCALES = ["es", "en"] as const;

interface RawSection {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  table?: { caption: string; headers: string[]; rows: string[][] };
}
interface RawPage {
  title: string;
  lead: string;
  sections: RawSection[];
}

function rawPage(locale: "es" | "en", id: InfoPageId): RawPage {
  const messages = messagesByLocale[locale];
  return (INFO_PAGES[id].namespace === "info" ? messages.info : messages.legal)[
    id as keyof typeof messages.info & keyof typeof messages.legal
  ] as unknown as RawPage;
}

function pageStrings(page: RawPage): string[] {
  return [
    page.lead,
    ...page.sections.flatMap((section) => [
      ...(section.paragraphs ?? []),
      ...(section.items ?? []),
      ...(section.table?.rows.flat() ?? []),
    ]),
  ];
}

function linkTargets(strings: string[]): string[] {
  return strings.flatMap((text) => [...text.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]!));
}

async function importPage(id: InfoPageId): Promise<PageModule> {
  return (await vi.importActual(PAGE_FILES[id])) as PageModule;
}

function expandName(text: string, locale: "es" | "en"): string {
  return text.replace("{appName}", messagesByLocale[locale].common.appName);
}

describe("páginas informativas y legales", () => {
  for (const id of ids) {
    for (const locale of LOCALES) {
      it(`/${locale}${INFO_PAGES[id].path} renderiza su título, su lead y una sección por tema`, async () => {
        activeLocale = locale;
        const page = rawPage(locale, id);
        render(await (await importPage(id)).default());

        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(expandName(page.title, locale));
        const main = screen.getByRole("main");
        const sectionTitles = page.sections.map((section) => section.title);
        const headings = within(main)
          .getAllByRole("heading", { level: 2 })
          .map((heading) => heading.textContent)
          .filter((text) => sectionTitles.includes(text ?? ""));
        // Las secciones salen todas y en el orden del contenido (el índice y "Más información" también usan h2).
        expect(headings).toEqual(sectionTitles);
        // Toda sección tiene cuerpo: párrafos, lista o tabla.
        for (const section of page.sections) {
          expect(
            (section.paragraphs?.length ?? 0) + (section.items?.length ?? 0) + (section.table ? 1 : 0),
          ).toBeGreaterThan(0);
        }
      });

      it(`/${locale}${INFO_PAGES[id].path} no deja marcadores sin sustituir y enlaza a las demás páginas`, async () => {
        activeLocale = locale;
        const { container } = render(await (await importPage(id)).default());

        expect(container.textContent).not.toMatch(/\{\w+\}/);
        expect(container.textContent).not.toMatch(/\]\(/);
        const related = screen.getByRole("navigation", {
          name: messagesByLocale[locale].info.ui.related,
        });
        const hrefs = within(related)
          .getAllByRole("link")
          .map((link) => link.getAttribute("href"));
        expect(hrefs).toEqual(INFO_PAGE_ORDER.filter((other) => other !== id).map((other) => INFO_PAGES[other].path));
      });
    }

    it(`/${id} declara metadata con título propio y noindex solo si falta la revisión legal`, async () => {
      activeLocale = "es";
      const meta = await (await importPage(id)).generateMetadata();

      expect(meta.title).toContain(commonEs.appName);
      expect(meta.title).toContain(expandName(rawPage("es", id).title, "es"));
      expect(meta.description).toBeTruthy();
      if (INFO_PAGES[id].pendingLegalReview) {
        expect(meta.robots).toMatchObject({ index: false, follow: false });
      } else {
        expect(meta.robots).toBeUndefined();
      }
    });

    it(`/${id} muestra el aviso de revisión pendiente solo si corresponde`, async () => {
      activeLocale = "es";
      render(await (await importPage(id)).default());
      const notice = screen.queryByRole("note");
      if (INFO_PAGES[id].pendingLegalReview) {
        expect(notice).toHaveTextContent(infoEs.ui.pendingNotice);
      } else {
        expect(notice).not.toBeInTheDocument();
      }
    });
  }

  it("las políticas vinculantes (términos, privacidad, cookies) son las que esperan revisión legal", () => {
    expect(ids.filter((id) => INFO_PAGES[id].pendingLegalReview).sort()).toEqual(["cookies", "privacy", "terms"]);
  });

  it("la fecha de última actualización sale de la ficha de la página, formateada en el idioma activo", async () => {
    activeLocale = "es";
    render(await (await importPage("about")).default());
    expect(screen.getByText(/Última actualización: 14 de noviembre de 2026/)).toBeInTheDocument();
  });

  it("las secciones con más de cuatro temas ofrecen un índice con anclas a cada una", async () => {
    activeLocale = "es";
    render(await (await importPage("terms")).default());
    const toc = screen.getByRole("navigation", { name: infoEs.ui.toc });
    const links = within(toc).getAllByRole("link");
    expect(links).toHaveLength(legalEs.terms.sections.length);
    for (const link of links) {
      const target = document.getElementById(link.getAttribute("href")!.slice(1));
      expect(target).not.toBeNull();
    }
  });

  it("las tablas son accesibles: leyenda, encabezados de columna y de fila", async () => {
    activeLocale = "es";
    render(await (await importPage("cookies")).default());
    const table = screen.getByRole("table", { name: legalEs.cookies.sections[1]!.table!.caption });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(table).getByRole("rowheader", { name: "music_session" })).toBeInTheDocument();
  });
});

describe("coherencia entre idiomas", () => {
  for (const id of ids) {
    it(`/${id}: es y en tienen las mismas secciones, listas, filas y enlaces`, () => {
      const es = rawPage("es", id);
      const en = rawPage("en", id);
      expect(en.sections.map((section) => section.id)).toEqual(es.sections.map((section) => section.id));
      for (const [index, section] of es.sections.entries()) {
        const other = en.sections[index]!;
        expect(other.paragraphs?.length ?? 0).toBe(section.paragraphs?.length ?? 0);
        expect(other.items?.length ?? 0).toBe(section.items?.length ?? 0);
        expect(other.table?.rows.length ?? 0).toBe(section.table?.rows.length ?? 0);
        expect(other.table?.headers.length ?? 0).toBe(section.table?.headers.length ?? 0);
      }
      expect(linkTargets(pageStrings(en))).toEqual(linkTargets(pageStrings(es)));
    });
  }

  it("la interfaz común (aviso, índice, enlaces relacionados) existe en los dos idiomas", () => {
    expect(Object.keys(infoEn.ui).sort()).toEqual(Object.keys(infoEs.ui).sort());
    expect(Object.keys(infoEn.pages).sort()).toEqual(Object.keys(infoEs.pages).sort());
    expect(Object.keys(infoEs.pages).sort()).toEqual([...ids].sort());
  });
});

// Una ruta como `/about/data-sources` existe si hay un `page.tsx` bajo `src/app/[locale]` (los grupos
// de rutas entre paréntesis no cuentan en la URL).
function routeExists(route: string): boolean {
  const target = route.split("/").filter(Boolean);
  const walk = (dir: string, remaining: string[]): boolean => {
    if (remaining.length === 0) return fs.existsSync(path.join(dir, "page.tsx"));
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    for (const entry of entries) {
      if (entry.name === remaining[0] && walk(path.join(dir, entry.name), remaining.slice(1))) return true;
      if (/^\(.+\)$/.test(entry.name) && walk(path.join(dir, entry.name), remaining)) return true;
    }
    return false;
  };
  return walk(path.join(process.cwd(), "src", "app", "[locale]"), target);
}

describe("enlaces internos", () => {
  it("cada página registrada tiene su ruta", () => {
    for (const id of ids) expect(routeExists(INFO_PAGES[id].path), INFO_PAGES[id].path).toBe(true);
  });

  it("todo enlace interno de los textos (es y en) apunta a una ruta que existe", () => {
    const targets = new Set<string>();
    for (const locale of LOCALES) {
      for (const id of ids) {
        for (const target of linkTargets(pageStrings(rawPage(locale, id)))) {
          if (target.startsWith("/")) targets.add(target);
        }
      }
    }
    expect(targets.size).toBeGreaterThan(5);
    for (const target of targets) expect(routeExists(target), target).toBe(true);
  });
});

describe("lo que los textos afirman de las cookies sigue siendo lo que hace el código", () => {
  function constantValue(file: string, name: string): string {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    const match = source.match(new RegExp(`${name}\\s*=\\s*"([^"]+)"`));
    expect(match, `${name} en ${file}`).not.toBeNull();
    return match![1]!;
  }

  it("la política de cookies lista cada cookie que la aplicación crea", () => {
    const listed = legalEs.cookies.sections
      .find((section) => section.id === "cookies")!
      .table!.rows.map((row) => row[0]);
    const created = [
      constantValue("src/services/auth/sessions.ts", "SESSION_COOKIE"),
      constantValue("src/services/auth/oauth-flow.ts", "OAUTH_STATE_COOKIE"),
      constantValue("src/lib/time-zone.ts", "TIME_ZONE_COOKIE"),
      constantValue("src/services/laminas/year-invitation.ts", "YEAR_INVITE_DISMISSED_COOKIE"),
      // La crea el middleware de next-intl (sin constante propia): se verificó con curl en una página.
      "NEXT_LOCALE",
    ];
    for (const name of created) expect(listed, name).toContain(name);
    // La tabla en inglés lista las mismas.
    expect(
      legalEn.cookies.sections.find((section) => section.id === "cookies")!.table!.rows.map((row) => row[0]),
    ).toEqual(listed);
  });

  it("la duración de la sesión y del flujo de Google coincide con la de los servicios", () => {
    const oauthTtl = fs.readFileSync(path.join(process.cwd(), "src/services/auth/oauth-flow.ts"), "utf8");
    expect(oauthTtl).toMatch(/OAUTH_STATE_TTL_MS = 10 \* 60 \* 1000/);
    const sessions = fs.readFileSync(path.join(process.cwd(), "src/services/auth/sessions.ts"), "utf8");
    // 30 días (sesión mantenida), 24 horas (sin mantener) y 400 días de tope de la cookie.
    expect(sessions).toContain("SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000");
    expect(sessions).toContain("EPHEMERAL_SESSION_TTL_MS = 24 * 60 * 60 * 1000");
    expect(sessions).toContain("REMEMBER_COOKIE_MAX_AGE_S = 400 * 24 * 60 * 60");
  });
});

describe("contenido que no debe perderse", () => {
  it("/es/privacy conserva lo que la aplicación hace con la cuenta: desactivar, reactivar, eliminar, exportar y límites", async () => {
    activeLocale = "es";
    const { container } = render(await (await importPage("privacy")).default());
    for (const id of ["personal", "deactivate", "reactivate", "delete", "export", "limits", "pending"]) {
      expect(container.querySelector(`#info-${id}`), id).not.toBeNull();
    }
    expect(container).toHaveTextContent("Nunca te lo pedimos al registrarte");
    expect(container).toHaveTextContent("No recogemos tu fecha de nacimiento, tu género ni tu nombre legal");
    expect(container).toHaveTextContent("Edad mínima");
    expect(container).toHaveTextContent("Cuenta desactivada");
  });

  it("/en/privacy says what is NOT collected and that it is never asked at sign-up", async () => {
    activeLocale = "en";
    const { container } = render(await (await importPage("privacy")).default());
    expect(container).toHaveTextContent("We never ask for it when you sign up");
    expect(container).toHaveTextContent("We do not collect your birth date, your gender or your legal name");
    expect(container).toHaveTextContent("Minimum age");
  });

  it("los documentos con puntos abiertos los listan en una sección «Por definir» con al menos un punto", async () => {
    for (const id of ["terms", "privacy", "cookies"] as const) {
      const pending = rawPage("es", id).sections.find((section) => section.id === "pending");
      expect(pending?.items?.length, id).toBeGreaterThan(0);
    }
  });

  it("/fuentes de datos: el contacto de retiro de carátulas es el configurado o, sin él, el general", async () => {
    activeLocale = "es";
    render(await (await importPage("dataSources")).default());
    const mailto = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("mailto:"))
      .map((link) => link.getAttribute("href"));
    expect(mailto.length).toBeGreaterThan(0);
    const allowed = new Set([`mailto:${CONTACT_EMAIL}`, `mailto:${process.env.COVER_ART_TAKEDOWN_EMAIL}`]);
    for (const href of mailto) expect(allowed.has(href!), href!).toBe(true);
  });

  it("/fuentes de datos: nombra todas las fuentes que la aplicación consulta", async () => {
    activeLocale = "es";
    const { container } = render(await (await importPage("dataSources")).default());
    for (const source of ["MusicBrainz", "Cover Art Archive", "Wikidata", "Wikipedia", "Wikimedia Commons", "ListenBrainz", "setlist.fm"]) {
      expect(container, source).toHaveTextContent(source);
    }
  });
});
