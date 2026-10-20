import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import awardsEs from "../../../messages/es/awards.json";
import type { NominationView } from "@/services/awards/read";
import { AwardCategory } from "./AwardCategory";
import { AwardsExploreSection } from "./AwardsExploreSection";
import { AwardTileGrid } from "./AwardTile";
import { RecentWinnersRail } from "./RecentWinnersRail";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/LazyCoverImage", () => ({ LazyCoverImage: () => <div data-testid="lazy-cover" /> }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: ({ className }: { className?: string }) => <div data-testid="cover" className={className} /> }));

const cover = (id: string) => ({ releaseGroupId: id, coverThumbUrl: null, coverResolved: true });

const nominations: NominationView[] = [
  {
    id: "w",
    won: true,
    text: "Cowboy Carter — Beyoncé",
    credit: null,
    subject: { kind: "release_group", album: { id: "rg-1", title: "COWBOY CARTER", artistName: "Beyoncé", cover: cover("rg-1") } },
  },
  { id: "t", won: false, text: "Sin resolver — Alguien", credit: null, subject: null },
  {
    id: "r",
    won: false,
    text: "Espresso — Sabrina Carpenter",
    credit: "Amy Allen, Steph Jones",
    subject: {
      kind: "recording",
      id: "rec-1",
      title: "Espresso",
      artistName: "Sabrina Carpenter",
      anchor: { id: "rg-2", title: "Short n’ Sweet", artistName: "Sabrina Carpenter", cover: cover("rg-2") },
    },
  },
];

describe("AwardCategory", () => {
  it("en una categoría de personas, un nominado sin foto lleva su inicial y no la silueta de disco", () => {
    const { container } = renderWithIntl(
      <AwardCategory
        name={{ es: "Productor del año", en: "Producer of the Year" }}
        coverage="complete"
        honors="performer"
        subjectKind="artist"
        nominations={[{ id: "p", won: true, text: "Cirkut", credit: null, subject: null }]}
      />,
    );

    expect(container.querySelector("[aria-hidden='true'].rounded-full")?.textContent).toBe("C");
  });

  it("el ganador se marca con trofeo y texto, sin bloque relleno", () => {
    renderWithIntl(<AwardCategory {...{ name: { es: "Álbum del año", en: "Album of the Year" }, coverage: "complete" as const, honors: "performer" as const, nominations }} />);

    const badge = screen.getByText(awardsEs.winner);
    expect(badge).not.toHaveClass("bg-amber");
    expect(badge.querySelector("svg")).not.toBeNull();
  });

  const props = { name: { es: "Álbum del año", en: "Album of the Year" }, coverage: "complete" as const, honors: "performer" as const, nominations };

  it("muestra el nombre traducido y el ganador primero, con título y artista en dos líneas y el título enlazado", () => {
    renderWithIntl(<AwardCategory {...props} link={{ href: "/awards/grammy/categories/album-of-the-year", label: awardsEs.categoryHistory }} />);
    expect(screen.getByRole("heading", { name: "Álbum del año" })).toBeInTheDocument();
    const lists = screen.getAllByRole("list");
    const winner = within(lists[0]!).getByRole("link", { name: "COWBOY CARTER" });
    expect(winner.getAttribute("href")).toMatch(/^\/album\/.*rg-1/);
    // El artista va en su propia línea, no pegado al título.
    expect(within(lists[0]!).getByText("Beyoncé")).toBeInTheDocument();
    expect(within(lists[0]!).queryByText(/COWBOY CARTER\s*—/)).not.toBeInTheDocument();
    expect(within(lists[0]!).getByText(awardsEs.winner)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(awardsEs.categoryHistory) })).toHaveAttribute(
      "href",
      "/awards/grammy/categories/album-of-the-year",
    );
    expect(screen.queryByText(awardsEs.winnerOnlyNote)).not.toBeInTheDocument();
  });

  it("un nominado sin resolver parte el texto curado en título y artista, sin enlace", () => {
    renderWithIntl(<AwardCategory {...props} name={{ es: "X", en: "X" }} />);
    expect(screen.getByText("Sin resolver")).toBeInTheDocument();
    expect(screen.getByText("Alguien")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sin resolver" })).not.toBeInTheDocument();
  });

  it("una grabación enlaza a su canción, muestra su artista, enlaza a su disco ancla y muestra los créditos", () => {
    renderWithIntl(<AwardCategory {...props} name={{ es: "X", en: "X" }} honors="songwriter" />);
    expect(screen.getByRole("link", { name: "Espresso" }).getAttribute("href")).toMatch(/^\/song\/.*rec-1/);
    expect(screen.getByText("Sabrina Carpenter")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "del disco Short n’ Sweet" }).getAttribute("href")).toMatch(/^\/album\/.*rg-2/);
    expect(screen.getByText("Amy Allen, Steph Jones")).toBeInTheDocument();
    expect(screen.getByText(awardsEs.songwriterNote)).toBeInTheDocument();
  });

  it("con cobertura winner_only lo dice y no ofrece nominados", () => {
    renderWithIntl(<AwardCategory {...props} name={{ es: "X", en: "X" }} coverage="winner_only" nominations={[nominations[0]!]} />);
    expect(screen.getByText(awardsEs.winnerOnlyNote)).toBeInTheDocument();
    expect(screen.queryByText(/Nominados \(/)).not.toBeInTheDocument();
  });

  it("en inglés usa el nombre en inglés", () => {
    renderWithIntl(<AwardCategory {...props} />, "en");
    expect(screen.getByRole("heading", { name: "Album of the Year" })).toBeInTheDocument();
    expect(screen.getByText("Nominees (2)")).toBeInTheDocument();
  });

  describe("destacada", () => {
    it("deja a todos los nominados a la vista, con su número, y sin control para plegar", () => {
      const { container } = renderWithIntl(<AwardCategory {...props} variant="featured" />);

      expect(container.querySelector("details")).toBeNull();
      expect(screen.getByText("Nominados (2)")).toBeVisible();
      expect(screen.getByText("Sin resolver")).toBeVisible();
      expect(screen.getByRole("link", { name: "Espresso" })).toBeVisible();
    });

    it("el ganador es la imagen grande y los nominados, chicas", () => {
      renderWithIntl(<AwardCategory {...props} variant="featured" />);

      const covers = screen.getAllByTestId("cover");
      expect(covers[0]).toHaveClass("size-28");
      expect(covers[1]).toHaveClass("size-12");
    });
  });

  describe("compacta", () => {
    it("pliega a los nominados bajo «Nominados (N)», cerrado por defecto, y deja al ganador a la vista", () => {
      const { container } = renderWithIntl(<AwardCategory {...props} variant="compact" />);

      const details = container.querySelector("details")!;
      expect(details).not.toHaveAttribute("open");
      expect(within(details).getByText("Nominados (2)")).toBeInTheDocument();
      expect(within(details).getByText("Sin resolver")).toBeInTheDocument();
      expect(within(details).getByRole("link", { name: "Espresso" })).toBeInTheDocument();
      // El ganador queda fuera del control plegable.
      expect(details).not.toContainElement(screen.getByRole("link", { name: "COWBOY CARTER" }));
      expect(screen.getByText(awardsEs.winner)).toBeInTheDocument();
    });

    it("el ganador va con una imagen mediana y los nominados, chicas", () => {
      renderWithIntl(<AwardCategory {...props} variant="compact" />);

      const covers = screen.getAllByTestId("cover");
      expect(covers[0]).toHaveClass("size-16");
      expect(covers[1]).toHaveClass("size-12");
    });

    it("usa un encabezado más chico y mantiene el enlace a la historia", () => {
      renderWithIntl(<AwardCategory {...props} variant="compact" headingLevel="h4" link={{ href: "/h", label: awardsEs.categoryHistory }} />);

      expect(screen.getByRole("heading", { level: 4, name: "Álbum del año" })).toHaveClass("text-base");
      expect(screen.getByRole("link", { name: new RegExp(awardsEs.categoryHistory) })).toHaveAttribute("href", "/h");
    });

    it("sin nominados (solo ganador) no hay control y sí la nota de cobertura", () => {
      const { container } = renderWithIntl(<AwardCategory {...props} variant="compact" coverage="winner_only" nominations={[nominations[0]!]} />);

      expect(container.querySelector("details")).toBeNull();
      expect(screen.getByText(awardsEs.winnerOnlyNote)).toBeInTheDocument();
    });
  });
});

describe("AwardsExploreSection", () => {
  it("no se renderiza sin ceremonias", () => {
    const { container } = renderWithIntl(<AwardsExploreSection ceremonies={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("enlaza cada ceremonia y el índice", () => {
    renderWithIntl(
      <AwardsExploreSection ceremonies={[{ awardSlug: "grammy", year: 2025, edition: 67, heldOn: "2025-02-02", voting: null, years: [2025], headline: null }]} />,
    );
    expect(screen.getByRole("link", { name: /Premios Grammy\s*2025/ })).toHaveAttribute("href", "/awards/grammy/2025");
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/awards");
  });

  it("muestra una tarjeta por premio, con su nombre traducido", () => {
    renderWithIntl(
      <AwardsExploreSection
        ceremonies={[
          { awardSlug: "brit-awards", year: 2026, edition: 46, heldOn: "2026-02-28", voting: null, years: [2026], headline: null },
          { awardSlug: "grammy", year: 2026, edition: 68, heldOn: "2026-02-01", voting: null, years: [2026], headline: null },
          { awardSlug: "lo-nuestro", year: 2026, edition: 38, heldOn: "2026-02-19", voting: null, years: [2026], headline: null },
          { awardSlug: "mercury-prize", year: 2025, edition: 34, heldOn: "2025-09-11", voting: null, years: [2025], headline: null },
          { awardSlug: "latin-grammy", year: 2025, edition: 26, heldOn: "2025-11-13", voting: null, years: [2025], headline: null },
        ]}
      />,
    );
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href) => href?.startsWith("/awards/"));
    expect(hrefs).toEqual([
      "/awards/brit-awards/2026",
      "/awards/grammy/2026",
      "/awards/lo-nuestro/2026",
      "/awards/mercury-prize/2025",
      "/awards/latin-grammy/2025",
    ]);
    expect(screen.getByText("Premios Brit")).toBeInTheDocument();
    expect(screen.getByText("Premio Mercury")).toBeInTheDocument();
    expect(screen.getByText("Premios Latin Grammy")).toBeInTheDocument();
    expect(screen.getByText("Premio Lo Nuestro")).toBeInTheDocument();
  });

  it("muestra el ganador destacado con título y artista del álbum del catálogo", () => {
    renderWithIntl(
      <AwardsExploreSection
        ceremonies={[
          {
            awardSlug: "grammy",
            year: 2024,
            edition: 66,
            heldOn: "2024-02-04",
            voting: null,
            years: [2024],
            headline: {
              category: { es: "Álbum del año", en: "Album of the Year" },
              winner: {
                id: "n1",
                won: true,
                text: "Midnights — Taylor Swift",
                credit: null,
                subject: {
                  kind: "release_group",
                  album: {
                    id: "rg1",
                    title: "Midnights",
                    artistName: "Taylor Swift",
                    cover: { releaseGroupId: "rg1", coverThumbUrl: null, coverResolved: true },
                  },
                },
              },
            },
          },
        ]}
      />,
    );
    const card = screen.getByRole("link", { name: /2024/ });
    expect(card).toHaveTextContent("Álbum del año");
    expect(card).toHaveTextContent("Midnights");
    expect(card).toHaveTextContent("Taylor Swift");
    expect(card).not.toHaveTextContent("Midnights — Taylor Swift");
  });
});

describe("AwardTileGrid detallada (hub)", () => {
  const brit = { awardSlug: "brit-awards", year: 2026, edition: 46, heldOn: "2026-02-28", headline: null };

  it("suma años, ceremonias y quién vota, y enlaza las ediciones anteriores fuera del enlace principal", () => {
    renderWithIntl(
      <AwardTileGrid detailed ceremonies={[{ ...brit, voting: "academy", years: [2026, 2025, 2024, 2023, 2022, 2021, 2020] }]} />,
    );
    const main = screen.getByRole("link", { name: /Premios Brit\s*2026/ });
    expect(main).toHaveAttribute("href", "/awards/brit-awards/2026");
    expect(main).toHaveTextContent("2020–2026 · 7 ceremonias · Vota la academia");
    const previous = within(screen.getByRole("navigation", { name: "Ediciones anteriores de Premios Brit" })).getAllByRole("link");
    expect(previous.map((link) => link.textContent)).toEqual(["2025", "2024", "2023", "2022", "2021"]);
    expect(previous[0]).toHaveAttribute("href", "/awards/brit-awards/2025");
    expect(main).not.toContainElement(previous[0]!);
  });

  it("con una sola ceremonia no muestra rango ni ediciones anteriores; en Explorar no muestra nada de eso", () => {
    const { unmount } = renderWithIntl(<AwardTileGrid detailed ceremonies={[{ ...brit, voting: null, years: [2026] }]} />);
    expect(screen.getByRole("link", { name: /Premios Brit/ })).toHaveTextContent("2026 · 1 ceremonia");
    expect(screen.queryByRole("navigation")).toBeNull();
    unmount();

    renderWithIntl(<AwardTileGrid ceremonies={[{ ...brit, voting: "academy", years: [2026, 2025] }]} />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("link")).not.toHaveTextContent("ceremonias");
  });
});

describe("RecentWinnersRail", () => {
  // jsdom no implementa ResizeObserver (el riel desplazable lo usa para las flechas).
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );

  it("no se renderiza sin ganadores; con ganadores, cada carátula abre el álbum o, sin álbum, la ceremonia", () => {
    const { container, unmount } = renderWithIntl(<RecentWinnersRail winners={[]} />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    const album = { id: "rg1", title: "Brat", artistName: "Charli xcx", cover: { releaseGroupId: "rg1", coverThumbUrl: null, coverResolved: true } };
    renderWithIntl(
      <RecentWinnersRail
        winners={[
          {
            awardSlug: "brit-awards",
            year: 2025,
            category: { es: "Álbum británico del año", en: "British Album of the Year" },
            winner: { id: "n1", won: true, text: "Brat — Charli xcx", credit: null, subject: { kind: "release_group", album } },
          },
          {
            awardSlug: "mercury-prize",
            year: 2023,
            category: { es: "Álbum del año", en: "Album of the Year" },
            winner: { id: "n2", won: true, text: "Sin catálogo", credit: "Alguien", subject: null },
          },
        ]}
      />,
    );
    const brat = screen.getByRole("link", { name: /Brat/ });
    expect(brat.getAttribute("href")).toContain("rg1");
    expect(brat).toHaveTextContent("Premios Brit 2025");
    expect(screen.getByRole("link", { name: /Sin catálogo/ })).toHaveAttribute("href", "/awards/mercury-prize/2023");
  });
});

describe("RecentWinnersRail con sesión", () => {
  const album = (id: string) => ({ id, title: id, artistName: "A", cover: { releaseGroupId: id, coverThumbUrl: null, coverResolved: true } });
  const entry = (awardSlug: string, id: string) => ({
    awardSlug,
    year: 2026,
    category: { es: "Álbum del año", en: "Album of the Year" },
    winner: { id: `${awardSlug}-n`, won: true, text: id, credit: null, subject: { kind: "release_group" as const, album: album(id) } },
  });
  const winners = [entry("grammy", "dtmf"), entry("brit-awards", "loving"), entry("mercury-prize", "people")];

  it("muestra el progreso, marca escuchados y pendientes y ofrece el filtro de los que faltan", () => {
    renderWithIntl(
      <RecentWinnersRail
        winners={winners}
        personal={{ heard: new Set(["loving"]), pending: new Set(["people"]), total: 3, heardCount: 1, missingOnly: false }}
      />,
    );
    expect(screen.getByText("Has escuchado 1 de 3 álbumes ganadores")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("link", { name: /loving/ })).toHaveTextContent("Escuchado");
    expect(screen.getByRole("link", { name: /people/ })).toHaveTextContent("Pendiente");
    expect(screen.getByRole("link", { name: /dtmf/ })).not.toHaveTextContent(/Escuchado|Pendiente/);
    const filter = within(screen.getByRole("navigation", { name: "Filtrar ganadores recientes" }));
    expect(filter.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "page");
    expect(filter.getByRole("link", { name: "Te faltan 2" })).toBeInTheDocument();
  });

  it("con todo escuchado lo dice y no ofrece filtro; con el filtro activo y nada pendiente, la sección sigue sin riel", () => {
    renderWithIntl(
      <RecentWinnersRail winners={[]} personal={{ heard: new Set(["dtmf"]), pending: new Set(), total: 1, heardCount: 1, missingOnly: true }} />,
    );
    expect(screen.getByText("Escuchaste el álbum ganador")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("sin sesión no muestra progreso ni marcas", () => {
    renderWithIntl(<RecentWinnersRail winners={winners} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText("Escuchado")).toBeNull();
  });
});
