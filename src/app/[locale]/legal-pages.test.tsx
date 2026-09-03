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
});
