import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { GenreAbout as About } from "@/services/genres/about-text";
import { GenreAbout } from "./GenreAbout";

const about = (over: Partial<About> = {}): About => ({
  language: "es",
  isFallback: false,
  title: "Shoegaze",
  url: "https://es.wikipedia.org/wiki/Shoegaze",
  excerpt: "El shoegaze es un subgénero del rock alternativo.",
  rest: null,
  ...over,
});

describe("GenreAbout", () => {
  it("muestra el primer párrafo con la atribución: Wikipedia con el título del artículo y la licencia", () => {
    renderWithIntl(<GenreAbout about={about()} />);
    expect(screen.getByRole("heading", { level: 2, name: "Sobre el género" })).toBeInTheDocument();
    expect(screen.getByText("El shoegaze es un subgénero del rock alternativo.")).toHaveAttribute("lang", "es");
    expect(screen.getByText(/Fuente: Wikipedia/)).toBeInTheDocument();
    const article = screen.getByRole("link", { name: "Shoegaze" });
    expect(article).toHaveAttribute("href", "https://es.wikipedia.org/wiki/Shoegaze");
    expect(article).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", expect.stringContaining("creativecommons.org/licenses/by-sa/4.0"));
  });

  it("el resto del texto va tras un desplegable", () => {
    const { container } = renderWithIntl(<GenreAbout about={about({ rest: "Segundo párrafo.\n\nTercero." })} />);
    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(screen.getByText("Leer más")).toBeInTheDocument();
    expect(details?.textContent).toContain("Segundo párrafo.");
    expect(details?.textContent).toContain("Tercero.");
  });

  it("sin resto no hay desplegable", () => {
    const { container } = renderWithIntl(<GenreAbout about={about()} />);
    expect(container.querySelector("details")).toBeNull();
  });

  it("un texto de respaldo indica en qué idioma está y lo marca con su lang", () => {
    renderWithIntl(<GenreAbout about={about({ language: "en", isFallback: true, excerpt: "Shoegaze is a subgenre." })} />);
    expect(screen.getByText(/Este texto está en inglés/)).toBeInTheDocument();
    expect(screen.getByText("Shoegaze is a subgenre.")).toHaveAttribute("lang", "en");
  });

  it("nombra el título del artículo aunque difiera del nombre del género", () => {
    renderWithIntl(<GenreAbout about={about({ title: "Música culta", url: "https://es.wikipedia.org/wiki/M%C3%BAsica_culta" })} />);
    expect(screen.getByRole("link", { name: "Música culta" })).toBeInTheDocument();
  });

  it("sin texto no renderiza nada", () => {
    const { container } = renderWithIntl(<GenreAbout about={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
