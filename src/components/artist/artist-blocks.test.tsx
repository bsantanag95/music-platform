import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { ArtistCommunity } from "./ArtistCommunity";
import { ArtistBiography } from "./ArtistBiography";
import { ArtistTabs, HiddenOnTab } from "./ArtistTabs";

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

describe("ArtistCommunity", () => {
  it("tres tarjetas: oyentes, seguidores con favoritos y listas enlazadas", () => {
    renderWithIntl(
      <ArtistCommunity stats={{ listeners: exact(312), followers: exact(120), favorites: exact(34), listCount: 12 }} listsHref="/artist/a1/lists" />,
    );
    const block = screen.getByRole("region", { name: artistEs.community.heading });
    expect(within(block).getByText("312")).toBeInTheDocument();
    expect(within(block).getByText("120")).toBeInTheDocument();
    expect(within(block).getByText((_, el) => el?.tagName === "DD" && el.textContent === "34 lo tienen de favorito")).toBeInTheDocument();
    expect(within(block).getByRole("link", { name: "12 →" })).toHaveAttribute("href", "/artist/a1/lists");
  });

  it("menos de 5: '<5' a la vista y el texto completo para lectores de pantalla", () => {
    renderWithIntl(<ArtistCommunity stats={{ listeners: fewer, followers: fewer, favorites: exact(0), listCount: 0 }} listsHref="/x" />);
    expect(screen.getAllByText("Menos de 5").length).toBe(2);
    expect(screen.getAllByText("<5").length).toBe(2);
    expect(screen.queryByText(/de favorito/)).not.toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("favoritos por debajo del umbral: '<5' a la vista, como la cifra principal", () => {
    renderWithIntl(<ArtistCommunity stats={{ listeners: exact(9), followers: exact(9), favorites: fewer, listCount: 0 }} listsHref="/x" />);
    const detail = screen.getByText((_, el) => el?.tagName === "DD" && /lo tienen de favorito$/.test(el.textContent ?? ""));
    expect(within(detail).getByText("<5")).toBeInTheDocument();
    expect(within(detail).getByText("Menos de 5")).toHaveClass("sr-only");
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

describe("HiddenOnTab (refine-artist-page-phase1)", () => {
  it("oculta el resumen en Biografía y lo muestra en las demás pestañas", () => {
    mocks.segment = "biography";
    const { unmount } = renderWithIntl(<HiddenOnTab tab="biography">resumen</HiddenOnTab>);
    expect(screen.queryByText("resumen")).not.toBeInTheDocument();
    unmount();
    mocks.segment = "members";
    renderWithIntl(<HiddenOnTab tab="biography">resumen</HiddenOnTab>);
    expect(screen.getByText("resumen")).toBeInTheDocument();
    mocks.segment = null;
  });
});
