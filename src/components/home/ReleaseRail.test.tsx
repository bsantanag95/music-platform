import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { ReleaseRail } from "./ReleaseRail";
import type { HomeRelease } from "@/services/home/home";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// jsdom no implementa ResizeObserver ni matchMedia (el riel los usa para las flechas y el movimiento).
vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function release(overrides: Partial<HomeRelease> & { id: string }): HomeRelease {
  return {
    title: `Disco ${overrides.id}`,
    artist: "Banda",
    coverThumbUrl: "https://example.com/cover.jpg",
    releaseDate: "2026-10-01",
    section: "recent",
    badge: null,
    ...overrides,
  };
}

function renderRail(releases: HomeRelease[]) {
  return render(
    <ReleaseRail
      releases={releases}
      locale="es"
      title="Lanzamientos"
      todayLabel="Hoy"
      upcomingPrefix="Sale"
      upcomingBadge="Próximo"
      badgeLabels={{ announced: "Anunciado", featured: "Destacado" }}
      prevLabel="Anterior"
      nextLabel="Siguiente"
    />,
  );
}

describe("ReleaseRail", () => {
  it("muestra la marca de cada tarjeta y el placeholder de un anunciado sin carátula", () => {
    const { container } = renderRail([
      release({ id: "a" }),
      release({ id: "b", badge: "featured" }),
      release({ id: "c", section: "upcoming", releaseDate: "2027-02-01", coverThumbUrl: null, badge: "announced" }),
    ]);

    expect(screen.getByText("Destacado")).toBeInTheDocument();
    expect(screen.getByText("Anunciado")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-release-badge]")).toHaveLength(2);
    const announcedCard = screen.getByText("Anunciado").closest("li")!;
    expect(announcedCard.querySelector("img")).toBeNull();
  });

  it("sin marca no agrega chip", () => {
    const { container } = renderRail([release({ id: "a" }), release({ id: "b", section: "upcoming", releaseDate: "2026-12-01" })]);
    expect(container.querySelectorAll("[data-release-badge]")).toHaveLength(0);
    expect(container.querySelector("[data-today-marker]")).not.toBeNull();
  });
});
