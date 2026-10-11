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
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <div data-testid="cover" /> }));

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
  it("muestra el nombre traducido, el ganador destacado primero y los nominados con sus enlaces", () => {
    renderWithIntl(
      <AwardCategory
        name={{ es: "Álbum del año", en: "Album of the Year" }}
        coverage="complete"
        honors="performer"
        nominations={nominations}
        link={{ href: "/awards/grammy/categories/album-of-the-year", label: awardsEs.categoryHistory }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Álbum del año" })).toBeInTheDocument();
    const lists = screen.getAllByRole("list");
    const winner = within(lists[0]!).getByRole("link", { name: "Cowboy Carter — Beyoncé" });
    expect(winner.getAttribute("href")).toMatch(/^\/album\/.*rg-1/);
    expect(within(lists[0]!).getByText(awardsEs.winner)).toBeInTheDocument();
    expect(screen.queryByText(awardsEs.winnerOnlyNote)).not.toBeInTheDocument();
  });

  it("un nominado sin resolver es solo texto, sin enlace", () => {
    renderWithIntl(<AwardCategory name={{ es: "X", en: "X" }} coverage="complete" honors="performer" nominations={nominations} />);
    expect(screen.getByText("Sin resolver — Alguien")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sin resolver — Alguien" })).not.toBeInTheDocument();
  });

  it("una grabación enlaza a su canción y a su disco ancla, y muestra los créditos", () => {
    renderWithIntl(<AwardCategory name={{ es: "X", en: "X" }} coverage="complete" honors="songwriter" nominations={nominations} />);
    expect(screen.getByRole("link", { name: "Espresso — Sabrina Carpenter" }).getAttribute("href")).toMatch(/^\/song\/.*rec-1/);
    expect(screen.getByRole("link", { name: "del disco Short n’ Sweet" }).getAttribute("href")).toMatch(/^\/album\/.*rg-2/);
    expect(screen.getByText("Amy Allen, Steph Jones")).toBeInTheDocument();
    expect(screen.getByText(awardsEs.songwriterNote)).toBeInTheDocument();
  });

  it("con cobertura winner_only lo dice", () => {
    renderWithIntl(
      <AwardCategory name={{ es: "X", en: "X" }} coverage="winner_only" honors="performer" nominations={[nominations[0]!]} />,
    );
    expect(screen.getByText(awardsEs.winnerOnlyNote)).toBeInTheDocument();
    expect(screen.queryByText(awardsEs.nominees)).not.toBeInTheDocument();
  });

  it("en inglés usa el nombre en inglés", () => {
    renderWithIntl(
      <AwardCategory name={{ es: "Álbum del año", en: "Album of the Year" }} coverage="complete" honors="performer" nominations={nominations} />,
      "en",
    );
    expect(screen.getByRole("heading", { name: "Album of the Year" })).toBeInTheDocument();
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
