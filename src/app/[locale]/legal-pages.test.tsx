import type { ReactElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createTranslator } from "next-intl";

import legalEs from "../../../messages/es/legal.json";
import legalEn from "../../../messages/en/legal.json";
import commonEs from "../../../messages/es/common.json";
import commonEn from "../../../messages/en/common.json";

const byLocale = {
  es: { legal: legalEs, common: commonEs },
  en: { legal: legalEn, common: commonEn },
} as const;

let activeLocale: "es" | "en" = "es";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: "legal" | "common") =>
    createTranslator({
      locale: activeLocale,
      messages: byLocale[activeLocale],
      namespace,
    }),
  ),
}));

type PageModule = {
  default: () => Promise<ReactElement>;
  generateMetadata: () => Promise<{ title?: string; robots?: unknown }>;
};

const slugs = ["about", "terms", "privacy", "cookies", "guidelines"] as const;

async function importPage(slug: string): Promise<PageModule> {
  return (await vi.importActual(`./${slug}/page`)) as PageModule;
}

describe("páginas de políticas placeholder", () => {
  for (const slug of slugs) {
    for (const locale of ["es", "en"] as const) {
      it(`/${locale}/${slug} renderiza título y cuerpo`, async () => {
        activeLocale = locale;
        const mod = await importPage(slug);
        render(await mod.default());

        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
          byLocale[locale].legal[slug].title,
        );
        expect(
          screen.getByText(byLocale[locale].legal[slug].body),
        ).toBeInTheDocument();
      });
    }

    it(`/${slug} declara metadata con noindex y título propio`, async () => {
      activeLocale = "es";
      const meta = await (await importPage(slug)).generateMetadata();

      expect(meta.title).toContain(legalEs[slug].title);
      expect(meta.title).toContain(commonEs.appName);
      expect(meta.robots).toMatchObject({ index: false, follow: false });
    });
  }

  it("las páginas de políticas incluyen el aviso de no vinculante", async () => {
    activeLocale = "es";
    render(await (await importPage("terms")).default());
    expect(screen.getByText(legalEs.placeholderNotice)).toBeInTheDocument();
  });

  it("'acerca de' no muestra el aviso de no vinculante", async () => {
    activeLocale = "es";
    const { container } = render(await (await importPage("about")).default());
    expect(container).not.toHaveTextContent(legalEs.placeholderNotice);
  });

  for (const locale of ["es", "en"] as const) {
    it(`/${locale}/privacy describe los datos personales, desactivar, reactivar, eliminar y exportar, y lo que falta definir`, async () => {
      activeLocale = locale;
      render(await (await importPage("privacy")).default());

      const { sections, intro } = byLocale[locale].legal.privacy;
      expect(screen.getByText(intro)).toBeInTheDocument();
      // Una sección (h2) por tema, en orden; la política sigue marcada como no vinculante.
      expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
        sections.personal.title,
        sections.deactivate.title,
        sections.reactivate.title,
        sections.delete.title,
        sections.export.title,
        sections.limits.title,
        sections.pending.title,
      ]);
      expect(screen.getByText(sections.deactivate.body2)).toBeInTheDocument();
      expect(screen.getByText(sections.delete.body2)).toBeInTheDocument();
      // Los puntos por definir salen todos, uno por ítem de lista.
      const items = screen.getAllByRole("listitem").map((li) => li.textContent);
      expect(items).toEqual(sections.pending.items);
      expect(items).toHaveLength(8);
      expect(screen.getByText(byLocale[locale].legal.placeholderNotice)).toBeInTheDocument();
    });
  }

  it("las demás políticas no muestran secciones de cuenta y datos", async () => {
    activeLocale = "es";
    render(await (await importPage("terms")).default());
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  for (const locale of ["es", "en"] as const) {
    it(`/${locale}/privacy: los datos personales opcionales del perfil (spec profile-personal-info)`, async () => {
      activeLocale = locale;
      render(await (await importPage("privacy")).default());
      const { personal, pending } = byLocale[locale].legal.privacy.sections;

      // Qué datos son y para qué, quién los ve, que nunca se piden al registrarse, cómo borrarlos
      // y que no se recogen fecha de nacimiento, género ni nombre legal.
      expect(screen.getByText(personal.body)).toBeInTheDocument();
      expect(screen.getByText(personal.body2)).toBeInTheDocument();
      expect(screen.getByText(personal.body3)).toBeInTheDocument();
      // La edad mínima queda anotada como punto por definir (último de la lista).
      expect(screen.getAllByRole("listitem").at(-1)).toHaveTextContent(pending.items.at(-1)!);
    });
  }

  it("/es/privacy dice explícitamente lo que NO se recoge y que nunca se pide al registrarse", async () => {
    activeLocale = "es";
    const { container } = render(await (await importPage("privacy")).default());
    expect(container).toHaveTextContent("Nunca te lo pedimos al registrarte");
    expect(container).toHaveTextContent("No recogemos tu fecha de nacimiento, tu género ni tu nombre legal");
    expect(container).toHaveTextContent("Edad mínima");
  });

  it("/en/privacy says what is NOT collected and that it is never asked at sign-up", async () => {
    activeLocale = "en";
    const { container } = render(await (await importPage("privacy")).default());
    expect(container).toHaveTextContent("We never ask for it when you sign up");
    expect(container).toHaveTextContent("We do not collect your birth date, your gender or your legal name");
    expect(container).toHaveTextContent("Minimum age");
  });
});
