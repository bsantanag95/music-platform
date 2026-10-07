import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ReleaseSwitcher } from "./ReleaseSwitcher";
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

function release(id: string, overrides: Partial<HomeRelease> = {}): HomeRelease {
  return {
    id,
    title: `Disco ${id}`,
    artist: "Banda",
    coverThumbUrl: "https://example.com/cover.jpg",
    releaseDate: "2026-10-01",
    section: "recent",
    badge: null,
    ...overrides,
  };
}

const railProps = {
  locale: "es",
  title: "Lanzamientos",
  todayLabel: "Hoy",
  upcomingPrefix: "Se lanza",
  upcomingBadge: "Próximo",
  badgeLabels: { announced: "Anunciado" },
  prevLabel: "Anterior",
  nextLabel: "Siguiente",
};

function renderSwitcher(
  props: Partial<Parameters<typeof ReleaseSwitcher>[0]> & Pick<Parameters<typeof ReleaseSwitcher>[0], "personal" | "popular">,
) {
  return render(
    <ReleaseSwitcher
      defaultTab="personal"
      showHint={false}
      railProps={railProps}
      tabLabels={{ personal: "De tus artistas", popular: "Populares" }}
      tablistLabel="Vista de lanzamientos"
      hint="Sigue artistas y sus lanzamientos aparecerán aquí."
      hintCta="Buscar artistas"
      {...props}
    />,
  );
}

const personal3 = [release("p1"), release("p2"), release("p3")];
const popular2 = [release("x1"), release("x2")];

describe("ReleaseSwitcher", () => {
  it("abre en la vista indicada y no mezcla las dos selecciones", () => {
    renderSwitcher({ personal: personal3, popular: popular2 });
    expect(screen.getByRole("tab", { name: "De tus artistas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco p1")).toBeInTheDocument();
    expect(screen.queryByText("Disco x1")).not.toBeInTheDocument();
    expect(document.querySelector("[data-release-hint]")).toBeNull();
  });

  it("cambia a Populares con el selector y vuelve", () => {
    renderSwitcher({ personal: personal3, popular: popular2 });
    fireEvent.click(screen.getByRole("tab", { name: "Populares" }));
    expect(screen.getByRole("tab", { name: "Populares" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco x2")).toBeInTheDocument();
    expect(screen.queryByText("Disco p1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "De tus artistas" }));
    expect(screen.getByText("Disco p3")).toBeInTheDocument();
  });

  it("con pocos discos propios abre en Populares e invita a seguir artistas", () => {
    renderSwitcher({ personal: [release("p1")], popular: popular2, defaultTab: "popular", showHint: true });
    expect(screen.getByRole("tab", { name: "Populares" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco x1")).toBeInTheDocument();
    const hint = document.querySelector("[data-release-hint]") as HTMLElement;
    expect(hint).not.toBeNull();
    expect(within(hint).getByRole("link", { name: "Buscar artistas" })).toHaveAttribute("href", "/search");
  });

  it("la vista personal vacía muestra solo la invitación, sin riel", () => {
    renderSwitcher({ personal: [], popular: popular2, defaultTab: "personal", showHint: true });
    expect(document.querySelector("[data-release-hint]")).not.toBeNull();
    expect(screen.queryByText("Disco x1")).not.toBeInTheDocument();
    expect(document.querySelector("ul")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Populares" }));
    expect(screen.getByText("Disco x1")).toBeInTheDocument();
  });

  it("sin populares no hay selector: solo la vista personal", () => {
    renderSwitcher({ personal: personal3, popular: [] });
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText("Disco p1")).toBeInTheDocument();
  });

  it("las flechas del teclado alternan las pestañas", () => {
    renderSwitcher({ personal: personal3, popular: popular2 });
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Populares" })).toHaveAttribute("aria-selected", "true");
  });
});
