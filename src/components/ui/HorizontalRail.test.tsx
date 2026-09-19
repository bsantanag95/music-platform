import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HorizontalRail } from "./HorizontalRail";

// jsdom no hace layout: `scrollWidth`/`clientWidth`/`scrollLeft` valen 0. Se
// fijan a mano sobre el elemento para simular un riel con overflow.
function setMetrics(el: HTMLElement, { scrollWidth, clientWidth, scrollLeft }: Record<string, number>) {
  Object.defineProperty(el, "scrollWidth", { configurable: true, value: scrollWidth });
  Object.defineProperty(el, "clientWidth", { configurable: true, value: clientWidth });
  Object.defineProperty(el, "scrollLeft", { configurable: true, writable: true, value: scrollLeft });
}

function renderRail() {
  render(
    <HorizontalRail label="Listas del perfil" prevLabel="Anteriores" nextLabel="Siguientes">
      <li>uno</li>
      <li>dos</li>
    </HorizontalRail>,
  );
  return screen.getByRole("list", { name: "Listas del perfil" });
}

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
}

describe("HorizontalRail", () => {
  beforeEach(() => mockReducedMotion(false));
  afterEach(() => vi.restoreAllMocks());

  it("sin overflow no muestra flechas", () => {
    const list = renderRail();
    setMetrics(list, { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
    fireEvent.scroll(list);
    expect(screen.queryByRole("button", { name: "Siguientes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anteriores" })).not.toBeInTheDocument();
  });

  it("con overflow y al inicio: 'Siguientes' activa, 'Anteriores' deshabilitada", () => {
    const list = renderRail();
    setMetrics(list, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 0 });
    fireEvent.scroll(list);
    expect(screen.getByRole("button", { name: "Siguientes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Anteriores" })).toBeDisabled();
  });

  it("al final del riel: 'Siguientes' deshabilitada, 'Anteriores' activa", () => {
    const list = renderRail();
    setMetrics(list, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 700 });
    fireEvent.scroll(list);
    expect(screen.getByRole("button", { name: "Siguientes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Anteriores" })).toBeEnabled();
  });

  it("las flechas desplazan ~80% del ancho visible, hacia adelante y hacia atrás", () => {
    const list = renderRail();
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy;
    setMetrics(list, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 300 });
    fireEvent.scroll(list);

    fireEvent.click(screen.getByRole("button", { name: "Siguientes" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 240, behavior: "smooth" });
    fireEvent.click(screen.getByRole("button", { name: "Anteriores" }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -240, behavior: "smooth" });
  });

  it("con prefers-reduced-motion salta sin animar", () => {
    mockReducedMotion(true);
    const list = renderRail();
    const scrollBy = vi.fn();
    list.scrollBy = scrollBy;
    setMetrics(list, { scrollWidth: 1000, clientWidth: 300, scrollLeft: 0 });
    fireEvent.scroll(list);

    fireEvent.click(screen.getByRole("button", { name: "Siguientes" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 240, behavior: "auto" });
  });

  it("la lista es enfocable por teclado", () => {
    expect(renderRail()).toHaveAttribute("tabindex", "0");
  });
});
