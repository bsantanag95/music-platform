import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import catalogEn from "../../../messages/en/catalog.json";
import { MIN_SECTIONS_FOR_JUMP_NAV } from "@/services/discovery/constants";
import { ExploreJumpNav, type JumpItem } from "./ExploreJumpNav";

const items = (labels: Record<string, string>, ids: string[]): JumpItem[] => ids.map((id) => ({ id, label: labels[id]! }));

const es = {
  colecciones: catalogEs.explore.jump.collections,
  popular: catalogEs.explore.jump.popular,
  generos: catalogEs.explore.jump.genres,
  novedades: catalogEs.explore.jump.newReleases,
  proximos: catalogEs.explore.jump.upcoming,
  premios: catalogEs.explore.jump.awards,
  // Con un solo salón (la etiqueta es un mensaje con plural: la página le pasa cuántos hay).
  "salon-de-la-fama": "Salón de la Fama",
  "mejor-valorados": catalogEs.explore.jump.topRated,
  decadas: catalogEs.explore.jump.decades,
};
const ALL = Object.keys(es);

describe("ExploreJumpNav", () => {
  it("enlaza cada sección a su ancla, en el orden recibido, bajo un nombre accesible", () => {
    renderWithIntl(<ExploreJumpNav label={catalogEs.explore.jump.label} items={items(es, ALL)} />);
    const nav = screen.getByRole("navigation", { name: "En esta página" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.textContent)).toEqual([
      "Colecciones",
      "Popular",
      "Géneros",
      "Novedades",
      "Próximos",
      "Premios",
      "Salón de la Fama",
      "Mejor valorados",
      "Décadas",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(ALL.map((id) => `#${id}`));
  });

  it("solo enlaza las secciones recibidas: una omitida no aparece", () => {
    const visible = ALL.filter((id) => id !== "novedades" && id !== "proximos");
    renderWithIntl(<ExploreJumpNav label="En esta página" items={items(es, visible)} />);
    expect(screen.queryByRole("link", { name: "Novedades" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Próximos" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(ALL.length - 2);
  });

  it("se omite con menos de MIN_SECTIONS_FOR_JUMP_NAV secciones y aparece con exactamente ese mínimo", () => {
    const few = renderWithIntl(<ExploreJumpNav label="En esta página" items={items(es, ALL.slice(0, MIN_SECTIONS_FOR_JUMP_NAV - 1))} />);
    expect(few.container).toBeEmptyDOMElement();
    few.unmount();
    renderWithIntl(<ExploreJumpNav label="En esta página" items={items(es, ALL.slice(0, MIN_SECTIONS_FOR_JUMP_NAV))} />);
    expect(screen.getAllByRole("link")).toHaveLength(MIN_SECTIONS_FOR_JUMP_NAV);
  });

  it("las cadenas existen en español y en inglés con las mismas claves", () => {
    expect(Object.keys(catalogEn.explore.jump)).toEqual(Object.keys(catalogEs.explore.jump));
    expect(catalogEn.explore.jump.label).toBe("On this page");
    for (const value of Object.values(catalogEn.explore.jump)) expect(value.length).toBeGreaterThan(0);
  });

  it("la entrada del Salón de la Fama va en plural cuando hay más de un salón", () => {
    type Translate = (key: string, values: { count: number }) => string;
    const translator = (locale: string, messages: unknown): Translate =>
      createTranslator({ locale, messages, namespace: "explore.jump" } as never) as unknown as Translate;
    const es = translator("es", { explore: catalogEs.explore });
    expect([es("hallOfFame", { count: 1 }), es("hallOfFame", { count: 2 })]).toEqual(["Salón de la Fama", "Salones de la Fama"]);
    const en = translator("en", { explore: catalogEn.explore });
    expect([en("hallOfFame", { count: 1 }), en("hallOfFame", { count: 2 })]).toEqual(["Hall of Fame", "Halls of Fame"]);
  });
});
