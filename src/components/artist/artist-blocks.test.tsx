import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { ArtistCommunity } from "./ArtistCommunity";
import { ArtistBiography } from "./ArtistBiography";
import { ArtistTabs } from "./ArtistTabs";

const mocks = vi.hoisted(() => ({ segment: null as string | null }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: () => mocks.segment }));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const artistEs = catalogEs.artist;
const exact = (value: number) => ({ kind: "exact" as const, value });
const fewer = { kind: "fewer" as const, threshold: 5 };

describe("ArtistCommunity (una línea, modernize-artist-page-phase1)", () => {
  it("oyentes, seguidores con favoritos y listas enlazadas", () => {
    const { container } = renderWithIntl(
      <ArtistCommunity stats={{ listeners: exact(312), followers: exact(120), favorites: exact(34), listCount: 12 }} listsHref="/artist/a1/lists" />,
    );
    expect(container).toHaveTextContent("312 oyentes · 120 seguidores (34 lo tienen de favorito) · 12 listas");
    expect(screen.getByRole("link", { name: "12 listas" })).toHaveAttribute("href", "/artist/a1/lists");
  });

  it("menos de 5: '<5' a la vista y el texto completo para lectores de pantalla; las cifras en 0 se omiten", () => {
    const { container } = renderWithIntl(<ArtistCommunity stats={{ listeners: fewer, followers: exact(0), favorites: exact(0), listCount: 0 }} listsHref="/x" />);
    expect(screen.getByText("<5")).toBeInTheDocument();
    expect(screen.getByText("Menos de 5")).toHaveClass("sr-only");
    expect(container.textContent).toContain("oyentes");
    expect(container.textContent).not.toContain("seguidor");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("favoritos por debajo del umbral: '<5' como la cifra principal", () => {
    renderWithIntl(<ArtistCommunity stats={{ listeners: exact(9), followers: exact(9), favorites: fewer, listCount: 0 }} listsHref="/x" />);
    expect(screen.getByText("<5")).toBeInTheDocument();
    expect(screen.getByText(/lo tienen de favorito/)).toBeInTheDocument();
  });

  it("sin actividad no muestra nada", () => {
    const { container } = renderWithIntl(<ArtistCommunity stats={{ listeners: exact(0), followers: exact(0), favorites: exact(0), listCount: 0 }} listsHref="/x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no muestra promedio de estrellas del artista", () => {
    renderWithIntl(<ArtistCommunity stats={{ listeners: exact(10), followers: exact(10), favorites: exact(10), listCount: 1 }} listsHref="/x" />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});

describe("ArtistBiography", () => {
  const summary = {
    text: "Primer párrafo de la biografía.\nSegundo párrafo.",
    title: "Pink Floyd",
    url: "https://es.wikipedia.org/wiki/Pink_Floyd",
    language: "es" as const,
  };

  it("introducción completa en párrafos, enlace al artículo y atribución", () => {
    renderWithIntl(<ArtistBiography summary={summary} />);
    expect(screen.getByText("Primer párrafo de la biografía.")).toBeInTheDocument();
    expect(screen.getByText("Segundo párrafo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${artistEs.biography.readFull} ↗` })).toHaveAttribute("href", summary.url);
    expect(screen.getByRole("link", { name: artistEs.summary.license })).toBeInTheDocument();
  });

  it("en otro idioma indica el idioma del texto", () => {
    renderWithIntl(<ArtistBiography summary={summary} />, "en");
    expect(screen.getByText("Text in Spanish")).toBeInTheDocument();
  });
});

describe("ArtistTabs", () => {
  it("Discografía activa por defecto y Biografía enlazable", () => {
    mocks.segment = null;
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography lineupTab={null} />);
    expect(screen.getByRole("link", { name: artistEs.tabs.discography })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: artistEs.tabs.biography })).toHaveAttribute("href", "/artist/a1/biography");
  });

  it("con Biografía activa marca esa pestaña", () => {
    mocks.segment = "biography";
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography lineupTab={null} />);
    expect(screen.getByRole("link", { name: artistEs.tabs.biography })).toHaveAttribute("aria-current", "page");
  });

  it("un grupo con alineación suma Integrantes entre Discografía y Biografía", () => {
    mocks.segment = "members";
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography lineupTab="members" />);
    const names = screen.getAllByRole("link").map((link) => link.textContent);
    expect(names).toEqual([artistEs.tabs.discography, artistEs.tabs.members, artistEs.tabs.biography]);
    const members = screen.getByRole("link", { name: artistEs.tabs.members });
    expect(members).toHaveAttribute("href", "/artist/a1/members");
    expect(members).toHaveAttribute("aria-current", "page");
  });

  it("una persona la ve como Bandas, en la misma URL", () => {
    mocks.segment = null;
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography={false} lineupTab="bands" />);
    expect(screen.getByRole("link", { name: artistEs.tabs.bands })).toHaveAttribute("href", "/artist/a1/members");
  });

  it("sin biografía no muestra la pestaña", () => {
    mocks.segment = null;
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography={false} lineupTab={null} />);
    expect(screen.queryByRole("link", { name: artistEs.tabs.biography })).not.toBeInTheDocument();
  });
});
