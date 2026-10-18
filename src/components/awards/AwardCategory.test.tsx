import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import awardsEs from "../../../messages/es/awards.json";
import type { NominationView } from "@/services/awards/read";
import { AwardCategory } from "./AwardCategory";
import { AwardsExploreSection } from "./AwardsExploreSection";

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

  it("un nominado sin resolver es solo el texto curado, sin enlace ni línea de artista", () => {
    renderWithIntl(<AwardCategory {...props} name={{ es: "X", en: "X" }} />);
    expect(screen.getByText("Sin resolver — Alguien")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sin resolver — Alguien" })).not.toBeInTheDocument();
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
      expect(screen.getByText("Sin resolver — Alguien")).toBeVisible();
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
      expect(within(details).getByText("Sin resolver — Alguien")).toBeInTheDocument();
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
      <AwardsExploreSection ceremonies={[{ awardSlug: "grammy", year: 2025, edition: 67, heldOn: "2025-02-02", headline: null }]} />,
    );
    expect(screen.getByRole("link", { name: /Premios Grammy\s*2025/ })).toHaveAttribute("href", "/awards/grammy/2025");
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/awards");
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
