import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import { ArtistFacts, ArtistFollowInvite, ArtistIdentity, ArtistPhotoCredit, ArtistPortrait } from "./ArtistHeader";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className, ...rest }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));

const artistEs = catalogEs.artist;

function profile(overrides: Partial<ArtistProfile> = {}): ArtistProfile {
  return {
    facts: { country: null, beginAreaName: null, lifeBegin: null, lifeEnd: null, lifeEnded: null },
    links: [],
    description: null,
    summary: null,
    placeLabel: null,
    photo: null,
    ...overrides,
  };
}

function dd(label: string): HTMLElement {
  return screen.getByText(label).nextElementSibling as HTMLElement;
}

const photo = {url: "https://thumb.wikimedia.org/k.jpg",author: "Carolina Gatica",license: "CC BY-SA 4.0",licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",sourceUrl: "https://commons.wikimedia.org/wiki/File:K.jpg"};

describe("ArtistPortrait (modernize-artist-page-phase1)", () => {
  it("con foto: retrato circular con la foto", () => {
    const { container } = renderWithIntl(<ArtistPortrait name="Kuervos del Sur" photo={photo} portrait={{ kind: "photo" }} />);
    expect(screen.getByRole("img", { name: "Foto de Kuervos del Sur" })).toHaveAttribute("src", photo.url);
    expect(container.firstElementChild).toHaveClass("rounded-full");
  });

  it("sin foto: la carátula en cuadrado, enlazada al disco", () => {
    renderWithIntl(
      <ArtistPortrait name="Iron Maiden" photo={null} portrait={{ kind: "cover", cover: { id: "rg1", title: "Piece of Mind", year: 1983, thumbUrl: "/c/rg1.jpg" } }} />,
    );
    const link = screen.getByRole("link", { name: "Carátula de Piece of Mind" });
    expect(link.getAttribute("href")).toContain("rg1");
    expect(link).toHaveClass("rounded-xl");
  });

  it("sin foto ni carátulas: las iniciales", () => {
    renderWithIntl(<ArtistPortrait name="Iron Maiden" photo={null} portrait={{ kind: "initials", initials: "IM" }} />);
    expect(screen.getByRole("img", { name: "Iron Maiden" })).toHaveTextContent("IM");
  });
});

describe("ArtistPhotoCredit", () => {
  it("crédito de la foto: autor al archivo y licencia a su texto", () => {
    renderWithIntl(<ArtistPhotoCredit photo={photo} />);
    expect(screen.getByRole("link", { name: "Foto: Carolina Gatica" })).toHaveAttribute("href", photo.sourceUrl);
    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", photo.licenseUrl);
  });

  it("sin foto no hay crédito", () => {
    const { container } = renderWithIntl(<ArtistPhotoCredit photo={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ArtistIdentity", () => {
  it("nombre y descripción traducida, sin antetítulo de tipo", () => {
    renderWithIntl(<ArtistIdentity name="Pink Floyd" description="banda de rock británica" />);
    expect(screen.getByRole("heading", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.getByText("banda de rock británica")).toBeInTheDocument();
    expect(screen.queryByText("Banda")).not.toBeInTheDocument();
  });

  it("sin descripción no deja una línea vacía", () => {
    const { container } = renderWithIntl(<ArtistIdentity name="X" description={null} />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});

describe("ArtistFollowInvite", () => {
  it("lleva al inicio de sesión con el nombre del artista y la frase", () => {
    renderWithIntl(<ArtistFollowInvite name="Iron Maiden" />);
    expect(screen.getByRole("link", { name: "Seguir a Iron Maiden" })).toHaveAttribute("href", "/auth/login");
    expect(screen.getByText(artistEs.followInviteNote)).toBeInTheDocument();
  });
});

describe("ArtistFacts", () => {
  it("grupo separado: origen traducido y actividad con estado", () => {
    renderWithIntl(
      <ArtistFacts
        type="group"
        firstMainYear={1967}
        profile={profile({
          facts: { country: "GB", beginAreaName: "London", lifeBegin: "1965", lifeEnd: "2014", lifeEnded: true },
          placeLabel: "Londres, Reino Unido",
        })}
      />,
    );
    expect(dd(artistEs.facts.origin)).toHaveTextContent("Londres, Reino Unido");
    expect(dd(artistEs.facts.activity)).toHaveTextContent("1965 – 2014 · Separada");
  });

  it("grupo activo con pocos datos: desde el año de formación y el país como origen", () => {
    renderWithIntl(
      <ArtistFacts type="group" firstMainYear={null} profile={profile({ facts: { country: "CL", beginAreaName: null, lifeBegin: "2003", lifeEnd: null, lifeEnded: false } })} />,
    );
    expect(dd(artistEs.facts.activity)).toHaveTextContent("desde 2003 · Activa");
    expect(dd(artistEs.facts.origin)).toHaveTextContent("Chile");
  });

  it("solista: nacimiento con fecha completa y lugar, y el año de su primer disco", () => {
    renderWithIntl(
      <ArtistFacts
        type="person"
        firstMainYear={2003}
        profile={profile({
          facts: { country: "MX", beginAreaName: "Viña del Mar", lifeBegin: "1983-05-02", lifeEnd: null, lifeEnded: false },
          placeLabel: "Viña del Mar, Chile",
        })}
      />,
    );
    expect(dd(artistEs.facts.born)).toHaveTextContent("2 de mayo de 1983 · Viña del Mar, Chile");
    expect(dd(artistEs.facts.firstRecord)).toHaveTextContent("2003");
    expect(screen.queryByText(artistEs.facts.activity)).not.toBeInTheDocument();
    expect(screen.queryByText(artistEs.facts.died)).not.toBeInTheDocument();
  });

  it("persona fallecida: fila de fallecimiento con la precisión que haya", () => {
    renderWithIntl(
      <ArtistFacts type="person" firstMainYear={null} profile={profile({ facts: { country: null, beginAreaName: null, lifeBegin: "1946-03", lifeEnd: "2006", lifeEnded: true } })} />,
    );
    expect(dd(artistEs.facts.born)).toHaveTextContent("marzo de 1946");
    expect(dd(artistEs.facts.died)).toHaveTextContent("2006");
  });

  it("enlaces en orden fijo: sitio oficial, Bandcamp, Wikipedia y streaming", () => {
    renderWithIntl(
      <ArtistFacts
        type="group"
        firstMainYear={null}
        profile={profile({
          links: [
            { kind: "streaming", url: "https://open.spotify.com/artist/x" },
            { kind: "official", url: "https://example.com" },
          ],
          summary: { text: "…", title: "X", url: "https://es.wikipedia.org/wiki/X", language: "es" },
        })}
      />,
    );
    expect(dd(artistEs.facts.links).textContent).toBe("Sitio oficial ↗ · Wikipedia ↗ · Spotify ↗");
  });

  it("En vivo enlaza a la página guardada en setlist.fm, fuera de la fila Enlaces (openspec: add-setlistfm-artist-link)", () => {
    renderWithIntl(
      <ArtistFacts
        type="group"
        name="Mötley Crüe"
        firstMainYear={null}
        profile={profile({
          links: [
            { kind: "official", url: "https://example.com" },
            { kind: "setlistfm", url: "https://www.setlist.fm/setlists/motley-crue-bd6b5d2.html" },
          ],
        })}
      />,
    );
    expect(dd(artistEs.facts.links).textContent).toBe("Sitio oficial ↗");
    const link = screen.getByRole("link", { name: /Conciertos en setlist\.fm/ });
    expect(link).toHaveAttribute("href", "https://www.setlist.fm/setlists/motley-crue-bd6b5d2.html");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).not.toContain("nofollow");
    expect(dd(artistEs.facts.live).textContent).toBe("Conciertos en setlist.fm ↗");
  });

  it("sin página guardada, En vivo busca el nombre en setlist.fm", () => {
    renderWithIntl(<ArtistFacts type="person" name="Mon Laferte & Café" firstMainYear={null} profile={profile()} />);
    expect(screen.getByRole("link", { name: /Conciertos en setlist\.fm/ })).toHaveAttribute(
      "href",
      "https://www.setlist.fm/search?query=Mon+Laferte+%26+Caf%C3%A9",
    );
  });

  it("un artista de tipo varios no tiene fila En vivo", () => {
    renderWithIntl(
      <ArtistFacts
        type="various"
        name="Various Artists"
        firstMainYear={null}
        profile={profile({ links: [{ kind: "setlistfm", url: "https://www.setlist.fm/setlists/x.html" }] })}
      />,
    );
    expect(dd(artistEs.facts.type)).toHaveTextContent("Varios artistas");
    expect(screen.queryByText(artistEs.facts.live)).not.toBeInTheDocument();
  });

  it("sin ningún dato, la ficha solo dice el tipo", () => {
    renderWithIntl(<ArtistFacts type="group" firstMainYear={null} profile={profile()} />);
    expect(dd(artistEs.facts.type)).toHaveTextContent("Banda");
    expect(screen.getAllByRole("definition")).toHaveLength(1);
  });

  it("géneros abren la primera línea, comunidad la cierra y los enlaces van en la segunda", () => {
    const { container } = renderWithIntl(
      <ArtistFacts
        type="group"
        name="Pink Floyd"
        firstMainYear={null}
        genres={<span>rock</span>}
        community={<span>312 oyentes</span>}
        profile={profile({ links: [{ kind: "official", url: "https://pinkfloyd.com" }] })}
      />,
    );
    const lines = container.querySelectorAll("dl > div");
    expect([...lines[0]!.querySelectorAll("[data-fact]")].map((el) => el.getAttribute("data-fact"))).toEqual(["genres", "type", "community"]);
    expect([...lines[1]!.querySelectorAll("[data-fact]")].map((el) => el.getAttribute("data-fact"))).toEqual(["links", "live"]);
  });
});
