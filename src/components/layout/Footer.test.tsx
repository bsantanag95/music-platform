import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { createTranslator } from "next-intl";

import footerEs from "../../../messages/es/footer.json";
import footerEn from "../../../messages/en/footer.json";
import commonEs from "../../../messages/es/common.json";
import commonEn from "../../../messages/en/common.json";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/site-links";

const messagesByLocale = {
  es: { footer: footerEs, common: commonEs },
  en: { footer: footerEn, common: commonEn },
} as const;

let activeLocale: "es" | "en" = "es";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: "footer" | "common") =>
    createTranslator({
      locale: activeLocale,
      messages: messagesByLocale[activeLocale],
      namespace,
    }),
  ),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("./Logo", () => ({ Logo: () => <div data-testid="logo" /> }));

import { Footer } from "./Footer";

async function renderFooter(
  props: Parameters<typeof Footer>[0] = {},
  locale: "es" | "en" = "es",
) {
  activeLocale = locale;
  render(await Footer(props));
}

describe("Footer", () => {
  it("renderiza un único landmark contentinfo", async () => {
    await renderFooter();
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  });

  it("expone cada grupo como nav con aria-label localizado", async () => {
    await renderFooter();
    for (const label of ["Explorar", "Tu cuenta", "Recursos", "Conectar", "Legal"]) {
      expect(
        screen.getByRole("navigation", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("para visitantes anónimos muestra iniciar sesión y registro, no perfil", async () => {
    await renderFooter({ user: null });
    const account = screen.getByRole("navigation", { name: "Tu cuenta" });
    expect(
      within(account).getByRole("link", { name: "Iniciar sesión" }),
    ).toHaveAttribute("href", "/auth/login");
    expect(
      within(account).getByRole("link", { name: "Crear cuenta" }),
    ).toHaveAttribute("href", "/auth/register");
    expect(
      within(account).queryByRole("link", { name: "Mi perfil" }),
    ).not.toBeInTheDocument();
  });

  it("con sesión muestra perfil y ajustes, no iniciar sesión", async () => {
    await renderFooter({
      user: { id: "u1", username: "ana blur", displayName: "Ana" },
    });
    const account = screen.getByRole("navigation", { name: "Tu cuenta" });
    expect(
      within(account).getByRole("link", { name: "Mi perfil" }),
    ).toHaveAttribute("href", "/users/ana%20blur");
    expect(
      within(account).getByRole("link", { name: "Ajustes" }),
    ).toHaveAttribute("href", "/me/settings/profile");
    expect(
      within(account).queryByRole("link", { name: "Iniciar sesión" }),
    ).not.toBeInTheDocument();
  });

  it("atribuye las tres fuentes de datos con enlaces externos seguros", async () => {
    await renderFooter();
    const cases: [string, string][] = [
      ["MusicBrainz", "https://musicbrainz.org"],
      ["Cover Art Archive", "https://coverartarchive.org"],
      ["MetaBrainz Foundation", "https://metabrainz.org"],
    ];
    for (const [name, href] of cases) {
      const link = screen.getByRole("link", { name: new RegExp(name) });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toMatch(/noopener/);
      expect(link.getAttribute("rel")).toMatch(/noreferrer/);
    }
  });

  it("aclara la no afiliación y que no es un servicio de streaming", async () => {
    await renderFooter();
    const attribution = screen.getByRole("region", { name: footerEs.attribution.label });
    expect(attribution).toHaveTextContent(
      /no está afiliada ni respaldada por la MetaBrainz Foundation/,
    );
    expect(screen.getByText(/No es un servicio de streaming/)).toBeInTheDocument();
  });

  it("la atribución es una línea corta, sin encabezado propio ni enlace a la página de fuentes", async () => {
    await renderFooter();
    const attribution = screen.getByRole("region", { name: footerEs.attribution.label });
    expect(within(attribution).queryByRole("heading")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Fuentes de datos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Fuentes de datos/ })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/data-sources/);
    }
  });

  it("Explorar y Recursos no repiten enlaces: Acerca de y Ayuda viven solo en Recursos", async () => {
    await renderFooter();
    const explore = screen.getByRole("navigation", { name: "Explorar" });
    expect(within(explore).queryByRole("link", { name: "Cómo funciona" })).not.toBeInTheDocument();
    const resources = screen.getByRole("navigation", { name: "Recursos" });
    expect(within(resources).getByRole("link", { name: "Acerca de" })).toHaveAttribute("href", "/about");
    expect(within(resources).getByRole("link", { name: "Ayuda" })).toHaveAttribute("href", "/help");
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/") && href !== "#top");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("grupo Conectar: mailto con la dirección visible y un enlace por red social", async () => {
    await renderFooter();
    const connect = screen.getByRole("navigation", { name: "Conectar" });
    const mail = within(connect).getByRole("link", {
      name: new RegExp(CONTACT_EMAIL.replace(".", "\\.")),
    });
    expect(mail).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`);
    expect(mail).toHaveTextContent(CONTACT_EMAIL);

    for (const link of SOCIAL_LINKS) {
      const el = within(connect).getByRole("link", {
        name: new RegExp(`^${link.id === "rss" ? "RSS" : link.id}`, "i"),
      });
      expect(el).toHaveAttribute("href", link.href);
      expect(el.getAttribute("href")).not.toBe("#");
      expect(el).toHaveAttribute("target", "_blank");
      expect(el.getAttribute("rel")).toMatch(/noopener/);
    }
  });

  it("barra inferior: copyright con el año y enlaces a las políticas", async () => {
    await renderFooter();
    const year = String(new Date().getFullYear());
    expect(screen.getByText(new RegExp(`©\\s*${year}`))).toBeInTheDocument();
    const legal = screen.getByRole("navigation", { name: "Legal" });
    for (const [name, href] of [
      ["Términos", "/terms"],
      ["Privacidad", "/privacy"],
      ["Cookies", "/cookies"],
      ["Directrices de la comunidad", "/guidelines"],
    ] as const) {
      expect(within(legal).getByRole("link", { name })).toHaveAttribute(
        "href",
        href,
      );
    }
  });

  it("incluye un ancla 'volver arriba' hacia #top y ningún selector de idioma", async () => {
    await renderFooter();
    expect(
      screen.getByRole("link", { name: /Volver arriba/ }),
    ).toHaveAttribute("href", "#top");
    expect(
      screen.queryByRole("button", { name: /^(es|en)$/i }),
    ).not.toBeInTheDocument();
  });

  it("se traduce completo al inglés", async () => {
    await renderFooter({}, "en");
    expect(
      screen.getByRole("navigation", { name: "Explore" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: footerEn.attribution.label }),
    ).toHaveTextContent(/not affiliated with or endorsed by the MetaBrainz Foundation/);
    expect(screen.getByText(/Not a streaming service/)).toBeInTheDocument();
  });
});

// `COVER_TAKEDOWN_EMAIL` se lee de `process.env` al cargar `site-links`; estos
// tests recargan el módulo tras fijar la variable (openspec: mirror-cover-art).
describe("Footer — contacto de retiro", () => {
  const original = process.env.COVER_ART_TAKEDOWN_EMAIL;

  afterEach(() => {
    if (original === undefined) delete process.env.COVER_ART_TAKEDOWN_EMAIL;
    else process.env.COVER_ART_TAKEDOWN_EMAIL = original;
    vi.resetModules();
  });

  it("muestra la frase y el mailto visible con el contacto configurado", async () => {
    activeLocale = "es";
    process.env.COVER_ART_TAKEDOWN_EMAIL = "retiro@ejemplo.com";
    vi.resetModules();
    const { Footer: FreshFooter } = await import("./Footer");

    render(await FreshFooter({}));

    expect(screen.getByText(/retiro de una carátula/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "retiro@ejemplo.com" });
    expect(link).toHaveAttribute("href", "mailto:retiro@ejemplo.com");
  });

  it("no muestra la frase sin contacto configurado", async () => {
    activeLocale = "es";
    delete process.env.COVER_ART_TAKEDOWN_EMAIL;
    vi.resetModules();
    const { Footer: FreshFooter } = await import("./Footer");

    render(await FreshFooter({}));

    expect(screen.queryByText(/retiro de una carátula/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "retiro@ejemplo.com" }),
    ).not.toBeInTheDocument();
  });
});

describe("Footer variante minimal (pantallas de foco)", () => {
  it("conserva la atribución de fuentes, el aviso de no afiliación y los enlaces legales", async () => {
    await renderFooter({ variant: "minimal" });

    const attribution = screen.getByRole("region", { name: footerEs.attribution.label });
    expect(within(attribution).getByRole("link", { name: /MusicBrainz/ })).toBeInTheDocument();
    expect(within(attribution).getByRole("link", { name: /Cover Art Archive/ })).toBeInTheDocument();
    expect(within(attribution).getByRole("link", { name: /MetaBrainz Foundation/ })).toBeInTheDocument();
    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(within(legal).getByRole("link", { name: "Términos" })).toHaveAttribute("href", "/terms");
    expect(within(legal).getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/privacy");
  });

  it("omite la navegación del sitio, la cuenta, los recursos y las redes", async () => {
    await renderFooter({ variant: "minimal", user: { id: "u1", username: "ana", displayName: "Ana" } });

    for (const label of ["Explorar", "Tu cuenta", "Recursos", "Conectar"]) {
      expect(screen.queryByRole("navigation", { name: label })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: new RegExp(footerEs.backToTop) })).not.toBeInTheDocument();
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  });
});

