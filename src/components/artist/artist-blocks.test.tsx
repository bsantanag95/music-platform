import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { ArtistCommunity } from "./ArtistCommunity";
import { AlsoIn } from "./AlsoIn";
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

describe("ArtistCommunity", () => {
  it("tres tarjetas: oyentes, seguidores con favoritos y listas enlazadas", () => {
    renderWithIntl(
      <ArtistCommunity stats={{ listeners: exact(312), followers: exact(120), favorites: exact(34), listCount: 12 }} listsHref="/artist/a1/lists" />,
    );
    const block = screen.getByRole("region", { name: artistEs.community.heading });
    expect(within(block).getByText("312")).toBeInTheDocument();
    expect(within(block).getByText("120")).toBeInTheDocument();
    expect(within(block).getByText("favorito de 34")).toBeInTheDocument();
    expect(within(block).getByRole("link", { name: "12 →" })).toHaveAttribute("href", "/artist/a1/lists");
  });

  it("menos de 5: '<5' a la vista y el texto completo para lectores de pantalla", () => {
    renderWithIntl(<ArtistCommunity stats={{ listeners: fewer, followers: fewer, favorites: exact(0), listCount: 0 }} listsHref="/x" />);
    expect(screen.getAllByText("Menos de 5").length).toBe(2);
    expect(screen.getAllByText("<5").length).toBe(2);
    expect(screen.queryByText(/favorito de/)).not.toBeInTheDocument();
    expect(screen.getByText(artistEs.community.listsNone)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("no muestra promedio de estrellas del artista", () => {
    renderWithIntl(<ArtistCommunity stats={{ listeners: exact(10), followers: exact(10), favorites: exact(10), listCount: 1 }} listsHref="/x" />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });
});

describe("AlsoIn", () => {
  it("una tarjeta por grupo con período y discos principales, enlazada al grupo", () => {
    renderWithIntl(
      <AlsoIn
        groups={[
          { id: "pf", name: "Pink Floyd", photoUrl: null, joinedOn: "1965-01-01", leftOn: "1985-12-12", mainCount: 12 },
          { id: "bh", name: "The Bleeding Heart Band", photoUrl: null, joinedOn: null, leftOn: null, mainCount: null },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: artistEs.alsoIn.heading })).toBeInTheDocument();
    const pf = screen.getByRole("link", { name: /Pink Floyd/ });
    expect(pf).toHaveAttribute("href", "/artist/pf");
    expect(pf).toHaveTextContent("1965 – 1985 · 12 discos principales");
    // Grupo sin discografía sincronizada: sin cantidad.
    const bh = screen.getByRole("link", { name: /Bleeding Heart/ });
    expect(bh).toHaveTextContent(artistEs.alsoIn.unknownPeriod);
    expect(bh).not.toHaveTextContent(/discos principales/);
  });

  it("sin grupos no renderiza nada", () => {
    const { container } = renderWithIntl(<AlsoIn groups={[]} />);
    expect(container).toBeEmptyDOMElement();
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
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography />);
    expect(screen.getByRole("link", { name: artistEs.tabs.discography })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: artistEs.tabs.biography })).toHaveAttribute("href", "/artist/a1/biography");
  });

  it("con Biografía activa marca esa pestaña", () => {
    mocks.segment = "biography";
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography />);
    expect(screen.getByRole("link", { name: artistEs.tabs.biography })).toHaveAttribute("aria-current", "page");
  });

  it("sin biografía no muestra la pestaña", () => {
    mocks.segment = null;
    renderWithIntl(<ArtistTabs artistId="a1" hasBiography={false} />);
    expect(screen.queryByRole("link", { name: artistEs.tabs.biography })).not.toBeInTheDocument();
  });
});
