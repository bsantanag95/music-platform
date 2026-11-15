import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { HowItWorks, DEMO_FEATURES, LISTED_FEATURES } from "./HowItWorks";
import homeEs from "../../../messages/es/home.json";
import collectionEs from "../../../messages/es/collection.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next-intl/server", async () => {
  const home = (await import("../../../messages/es/home.json")).default as Record<string, string>;
  const diary = (await import("../../../messages/es/diary.json")).default as Record<string, unknown>;
  const collection = (await import("../../../messages/es/collection.json")).default as Record<string, unknown>;
  const namespaces: Record<string, Record<string, unknown>> = { home, diary, collection };
  return {
    getTranslations: vi.fn(async (namespace: string) => (key: string) => {
      const value = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], namespaces[namespace]);
      return typeof value === "string" ? value : key;
    }),
  };
});

async function renderShowcase() {
  const element = await HowItWorks();
  return renderWithIntl(element);
}

describe("HowItWorks", () => {
  it("muestra las nueve funciones a la vez, sin controles de carrusel", async () => {
    await renderShowcase();

    for (const n of [...DEMO_FEATURES, ...LISTED_FEATURES]) {
      expect(screen.getByRole("heading", { name: homeEs[`feature${n}Title` as keyof typeof homeEs] as string })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("las demostraciones son ilustrativas: ocultas a lectores de pantalla y sin usuarios", async () => {
    const { container } = await renderShowcase();

    const demos = container.querySelectorAll('[aria-hidden="true"].rounded-lg');
    expect(demos).toHaveLength(3);
    for (const demo of demos) expect(demo.textContent).not.toContain("@");
  });

  it("la colección física usa los nombres de atributos de la aplicación", async () => {
    const { container } = await renderShowcase();

    expect(container.textContent).toContain(collectionEs.attribute["first-press"]);
    expect(container.textContent).toContain(collectionEs.format.vinyl);
  });
});
