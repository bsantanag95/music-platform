import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import type { ArtistProfile } from "@/services/catalog/artist-profile-read";
import { ArtistFacts, ArtistIdentity, ArtistPhoto, ArtistSummary } from "./ArtistHeader";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
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

describe("ArtistPhoto", () => {
  it("foto CC BY-SA con crédito: autor al archivo y licencia a su texto", () => {
    renderWithIntl(
      <ArtistPhoto
        name="Kuervos del Sur"
        photo={{
          url: "https://thumb.wikimedia.org/k.jpg",
          author: "Carolina Gatica",
          license: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:K.jpg",
        }}
      />,
    );
    expect(screen.getByRole("img", { name: "Foto de Kuervos del Sur" })).toHaveAttribute("src", "https://thumb.wikimedia.org/k.jpg");
    expect(screen.getByRole("link", { name: "Foto: Carolina Gatica" })).toHaveAttribute("href", "https://commons.wikimedia.org/wiki/File:K.jpg");
    expect(screen.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveAttribute("href", "https://creativecommons.org/licenses/by-sa/4.0");
  });

  it("sin foto muestra el placeholder y ningún crédito", () => {
    renderWithIntl(<ArtistPhoto name="X" photo={null} />);
    expect(screen.getByRole("img", { name: artistEs.noPhotoAlt })).toBeInTheDocument();
    expect(screen.queryByText(/Foto:/)).not.toBeInTheDocument();
  });
});

describe("ArtistIdentity", () => {
  it("antetítulo de tipo, nombre y descripción traducida", () => {
    renderWithIntl(<ArtistIdentity type="group" name="Pink Floyd" description="banda de rock británica" />);
    expect(screen.getByText("Banda")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.getByText("banda de rock británica")).toBeInTheDocument();
  });

  it("sin descripción no deja una línea vacía", () => {
    const { container } = renderWithIntl(<ArtistIdentity type="person" name="X" description={null} />);
    expect(screen.getByText("Solista")).toBeInTheDocument();
    expect(container.querySelectorAll("p")).toHaveLength(1);
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
    const { container } = renderWithIntl(
      <ArtistFacts
        type="various"
        name="Various Artists"
        firstMainYear={null}
        profile={profile({ links: [{ kind: "setlistfm", url: "https://www.setlist.fm/setlists/x.html" }] })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("sin ningún dato, la ficha no se renderiza", () => {
    const { container } = renderWithIntl(<ArtistFacts type="group" firstMainYear={null} profile={profile()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ArtistSummary", () => {
  const summary = { text: "Pink Floyd fue una banda de rock británica.\nSegundo párrafo.", title: "Pink Floyd", url: "https://es.wikipedia.org/wiki/Pink_Floyd", language: "es" as const };

  it("resumen en el idioma de la interfaz: primer párrafo, seguir leyendo y atribución", () => {
    renderWithIntl(<ArtistSummary artistId="a1" summary={summary} />);
    expect(screen.getByText("Pink Floyd fue una banda de rock británica.")).toBeInTheDocument();
    expect(screen.queryByText("Segundo párrafo.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: `${artistEs.summary.readMore} →` })).toHaveAttribute("href", "/artist/a1/biography");
    expect(screen.getByRole("link", { name: artistEs.summary.source })).toHaveAttribute("href", summary.url);
    expect(screen.getByRole("link", { name: artistEs.summary.license })).toBeInTheDocument();
    expect(screen.queryByText(/Resumen en/)).not.toBeInTheDocument();
  });

  it("resumen en otro idioma: lo indica", () => {
    renderWithIntl(<ArtistSummary artistId="a1" summary={summary} />, "en");
    expect(screen.getByText("Summary in Spanish")).toBeInTheDocument();
  });

  it("sin resumen no renderiza nada", () => {
    const { container } = renderWithIntl(<ArtistSummary artistId="a1" summary={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
