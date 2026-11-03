import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { SearchLanding } from "./SearchLanding";

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
vi.mock("./RecentSearches", () => ({ RecentSearches: () => <div>recientes</div> }));

const landing = catalogEs.search.landing;

describe("SearchLanding (refine-search-results-phase2)", () => {
  it("con actividad: recientes, 'Prueba con' con artistas y discos, y el consejo", () => {
    renderWithIntl(
      <SearchLanding
        suggestions={{
          artists: [{ id: "a1", name: "Charli xcx", photoUrl: null }],
          albums: [{ id: "r1", title: "BRAT", artistName: "Charli xcx", year: 2024, coverThumbUrl: null, coverResolved: true }],
        }}
      />,
    );
    expect(screen.getByText("recientes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: landing.tryHeading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Charli xcx\s*Artista/ })).toHaveAttribute("href", expect.stringContaining("/artist/"));
    expect(screen.getByRole("link", { name: /BRAT/ })).toHaveAttribute("href", expect.stringContaining("/album/"));
    expect(screen.getByText("Álbum de Charli xcx · 2024")).toBeInTheDocument();
  });

  it("sin actividad no muestra 'Prueba con'", () => {
    renderWithIntl(<SearchLanding suggestions={null} />);
    expect(screen.queryByRole("heading", { name: landing.tryHeading })).not.toBeInTheDocument();
    expect(screen.getByText(new RegExp(landing.tip.slice(0, 20)))).toBeInTheDocument();
  });
});
