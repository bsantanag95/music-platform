import { describe, it, expect, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import { ReleaseTimetable, TIMETABLE_VISIBLE, splitTimetable } from "./ReleaseTimetable";
import type { HomeRelease } from "@/services/home/home";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));

function release(i: number, section: HomeRelease["section"], day: number): HomeRelease {
  return {
    id: `0000000${i}-0000-4000-8000-000000000000`,
    title: `Disco ${i}`,
    artist: `Artista ${i}`,
    coverThumbUrl: "https://example.com/c.jpg",
    releaseDate: `2026-11-${String(day).padStart(2, "0")}`,
    section,
    badge: null,
  };
}

const labels = {
  recent: "Recientes",
  upcoming: "Próximos",
  published: "Publicado",
  upcomingBadge: "Próximo",
  showMore: (count: number) => `Ver ${count} más`,
  showLess: "Ver menos",
};

describe("splitTimetable", () => {
  it("ordena recientes de la más nueva a la más vieja y próximos de la más cercana a la más lejana", () => {
    const { recent, upcoming } = splitTimetable([
      release(1, "recent", 3),
      release(2, "upcoming", 28),
      release(3, "recent", 12),
      release(4, "upcoming", 20),
    ]);
    expect(recent.map((r) => r.releaseDate)).toEqual(["2026-11-12", "2026-11-03"]);
    expect(upcoming.map((r) => r.releaseDate)).toEqual(["2026-11-20", "2026-11-28"]);
  });
});

describe("ReleaseTimetable", () => {
  it("muestra seis por parte y deja el resto en la misma página", () => {
    const recent = Array.from({ length: 9 }, (_, i) => release(i + 1, "recent", i + 1));
    render(<ReleaseTimetable releases={recent} locale="es" labels={labels} labelledBy="home-releases" />);

    const section = screen.getByRole("region", { name: /Recientes/ });
    const lists = within(section).getAllByRole("list");
    expect(within(lists[0]!).getAllByRole("listitem")).toHaveLength(TIMETABLE_VISIBLE);
    expect(within(section).getByText("Ver 3 más")).toBeInTheDocument();
    expect(within(lists[1]!).getAllByRole("listitem")).toHaveLength(3);
  });

  it("cada fila enlaza al disco y muestra su estado", () => {
    render(
      <ReleaseTimetable
        releases={[release(1, "recent", 3), release(2, "upcoming", 20)]}
        locale="es"
        labels={labels}
        labelledBy="home-releases"
      />,
    );

    expect(screen.getByRole("link", { name: /Disco 1/ }).getAttribute("href")).toMatch(/^\/album\/artista-1-disco-1/);
    expect(screen.getByRole("link", { name: /Disco 1/ })).toHaveTextContent("Publicado");
    expect(screen.getByRole("link", { name: /Disco 2/ })).toHaveTextContent("Próximo");
  });

  it("con solo próximos no muestra una parte de recientes vacía", () => {
    render(
      <ReleaseTimetable releases={[release(1, "upcoming", 20)]} locale="es" labels={labels} labelledBy="home-releases" />,
    );

    expect(screen.queryByRole("region", { name: /Recientes/ })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Próximos/ })).toBeInTheDocument();
  });

  it("sin lanzamientos no renderiza nada", () => {
    const { container } = render(
      <ReleaseTimetable releases={[]} locale="es" labels={labels} labelledBy="home-releases" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
