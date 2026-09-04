import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeedRatingMeter } from "./FeedRatingMeter";

describe("FeedRatingMeter", () => {
  it("muestra el valor numérico solo, sin score", () => {
    render(<FeedRatingMeter stars="3.0" detailedScore={null} label="3.0 de 5 estrellas" />);
    expect(screen.getByText("3.0")).toBeInTheDocument();
  });

  it("muestra estrellas · score cuando hay score detallado", () => {
    render(<FeedRatingMeter stars="4.5" detailedScore={87} label="4.5 de 5 estrellas, 87 de 100" />);
    expect(screen.getByText("4.5 · 87")).toBeInTheDocument();
  });

  it("expone el valor como aria-label legible y oculta las marcas", () => {
    const { container } = render(
      <FeedRatingMeter stars="2.0" detailedScore={null} label="2.0 de 5 estrellas" />,
    );
    expect(screen.getByRole("img", { name: "2.0 de 5 estrellas" })).toBeInTheDocument();
    // las 5 marcas de la escala están, pero decorativas
    expect(container.querySelectorAll("[aria-hidden] > span")).toHaveLength(5);
  });

  it("enciende marcas llenas y media marca según el valor", () => {
    const { container } = render(
      <FeedRatingMeter stars="2.5" detailedScore={null} label="2.5 de 5 estrellas" />,
    );
    const fills = container.querySelectorAll("span.bg-amber");
    // 2 marcas llenas (100%) + 1 media (50%)
    const widths = Array.from(fills).map((el) => (el as HTMLElement).style.width);
    expect(widths).toEqual(["100%", "100%", "50%"]);
  });
});
