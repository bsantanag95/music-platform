import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { JumpNavLinks, pickActiveSection } from "./JumpNavLinks";

const items = [
  { id: "colecciones", label: "Colecciones" },
  { id: "popular", label: "Popular" },
  { id: "decadas", label: "Décadas" },
];

describe("pickActiveSection", () => {
  const sections = [
    { id: "colecciones", top: 300 },
    { id: "popular", top: 900 },
    { id: "decadas", top: 1600 },
  ];

  it("sin ninguna sección por encima de la línea, ninguna está activa", () => {
    expect(pickActiveSection(sections, 200, false)).toBeNull();
  });

  it("gana la última sección cuyo borde superior pasó la línea", () => {
    expect(pickActiveSection(sections.map((s) => ({ ...s, top: s.top - 1000 })), 130, false)).toBe("popular");
  });

  it("al llegar al final de la página gana la última, aunque sea corta", () => {
    expect(pickActiveSection(sections, 130, true)).toBe("decadas");
  });

  it("sin secciones no hay activa", () => {
    expect(pickActiveSection([], 130, true)).toBeNull();
  });
});

describe("JumpNavLinks", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("sin JavaScript (HTML del servidor) son enlaces a las anclas y ninguno está marcado", () => {
    const html = renderToString(<JumpNavLinks items={items} />);
    expect(html).toContain('href="#colecciones"');
    expect(html).toContain('href="#decadas"');
    expect(html).not.toContain("aria-current");
  });

  it("marca como actual el enlace de la sección que está a la vista", () => {
    // En jsdom la barra mide 0: la línea queda en 24 px (su borde inferior + margen).
    const tops: Record<string, number> = { colecciones: -800, popular: 10, decadas: 900 };
    for (const id of Object.keys(tops)) {
      const section = document.createElement("section");
      section.id = id;
      section.getBoundingClientRect = () => ({ top: tops[id]! }) as DOMRect;
      document.body.appendChild(section);
    }
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 10_000 });

    render(
      <div className="sticky">
        <JumpNavLinks items={items} />
      </div>,
    );
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });

    expect(screen.getByRole("link", { name: "Popular" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Colecciones" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Décadas" })).not.toHaveAttribute("aria-current");
  });
});
