import { describe, it, expect, vi } from "vitest";
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
    ).toHaveAttribute("href", "/me/settings");
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

  it("aclara la no afiliación y que no reproduce audio", async () => {
    await renderFooter();
    expect(
      screen.getByText(/no está afiliada ni respaldada por la MetaBrainz Foundation/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no reproduce ni aloja audio/),
    ).toBeInTheDocument();
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
      screen.getByText(/does not play or host audio/),
    ).toBeInTheDocument();
  });
});
