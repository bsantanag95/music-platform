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
  generos: catalogEs.explore.jump.genres,
  novedades: catalogEs.explore.jump.newReleases,
  proximos: catalogEs.explore.jump.upcoming,
  premios: catalogEs.explore.jump.awards,
  "mejor-valorados": catalogEs.explore.jump.topRated,
  "mas-resenados": catalogEs.explore.jump.mostReviewed,
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
      "Géneros",
      "Novedades",
      "Próximos",
      "Premios",
      "Mejor valorados",
      "Más reseñados",
      "Décadas",
    ]);
    expect(links.map((a) => a.getAttribute("href"))).toEqual(ALL.map((id) => `#${id}`));
  });

  it("solo enlaza las secciones recibidas: una omitida no aparece", () => {
    const visible = ALL.filter((id) => id !== "novedades" && id !== "proximos");
    renderWithIntl(<ExploreJumpNav label="En esta página" items={items(es, visible)} />);
    expect(screen.queryByRole("link", { name: "Novedades" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Próximos" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(6);
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
});
