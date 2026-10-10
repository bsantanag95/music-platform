import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { parseExploreListParams } from "@/services/discovery/explore-params";
import { DecadeHistogram } from "./DecadeHistogram";
import { ExploreFilterBar } from "./ExploreFilterBar";
import { FamilyGrid } from "./FamilyGrid";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode; scroll?: boolean }) => {
    // `scroll` es una prop del `Link` de next-intl, no un atributo de `<a>`.
    const attrs: Record<string, unknown> = { ...rest };
    delete attrs.scroll;
    return (
      <a href={`/es${href}`} {...attrs}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ replace: vi.fn() }),
}));

const categoryLabels = {
  studio: "De estudio",
  single_ep: "Singles y EPs",
  compilation: "Compilaciones",
  live_other: "Directos y otros",
};

describe("DecadeHistogram", () => {
  const decades = [2000, 1990, 1970].map((decade, i) => ({
    decade,
    count: (i + 1) * 10,
    href: `/explore?decada=${decade}`,
    countLabel: String((i + 1) * 10),
    ariaLabel: `${decade}s: ${(i + 1) * 10} álbumes`,
  }));

  it("dibuja las columnas en orden cronológico, cada una con su nombre accesible", () => {
    renderWithIntl(<DecadeHistogram heading="Explorar por década" decades={decades} />);
    const [columns] = screen.getAllByRole("list");
    const links = within(columns!).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("aria-label"))).toEqual([
      "1970s: 30 álbumes",
      "1990s: 20 álbumes",
      "2000s: 10 álbumes",
    ]);
    expect(links[0]).toHaveAttribute("href", "/es/explore?decada=1970");
  });

  it("no renderiza nada sin décadas", () => {
    const { container } = renderWithIntl(<DecadeHistogram heading="Explorar por década" decades={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FamilyGrid", () => {
  const tile = (key: string, count: number) => ({
    key,
    label: key,
    href: `/explore?familia=${key}`,
    count,
    countLabel: `${count} álbumes`,
  });

  it("enlaza cada familia y deja las secundarias tras el desplegable", () => {
    renderWithIntl(
      <FamilyGrid
        heading="Explorar por género"
        families={[tile("rock", 100), tile("jazz", 20)]}
        moreFamilies={[tile("world", 2)]}
        moreLabel="1 familia más"
      />,
    );
    expect(screen.getByRole("link", { name: /rock/ })).toHaveAttribute("href", "/es/explore?familia=rock");
    expect(screen.getByText("20 álbumes")).toBeInTheDocument();
    expect(screen.getByText("1 familia más").closest("details")).not.toHaveAttribute("open");
  });
});

describe("ExploreFilterBar", () => {
  it("marca el tipo actual y sus enlaces conservan el orden y vuelven a la página 1", () => {
    renderWithIntl(
      <ExploreFilterBar
        baseHref="/explore?decada=1990"
        params={parseExploreListParams({ tipo: "studio", orden: "az", page: "3" })}
        categoryLabels={categoryLabels}
      />,
    );
    expect(screen.getByRole("link", { name: "De estudio" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/es/explore?decada=1990&orden=az");
    expect(screen.getByRole("link", { name: "Compilaciones" })).toHaveAttribute(
      "href",
      "/es/explore?decada=1990&tipo=compilation&orden=az",
    );
  });
});
