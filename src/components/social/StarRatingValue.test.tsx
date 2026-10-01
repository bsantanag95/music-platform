import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { StarRatingValue } from "./StarRatingValue";

describe("StarRatingValue", () => {
  it("muestra el valor numérico solo, sin score", () => {
    renderWithIntl(<StarRatingValue stars="3.0" detailedScore={null} label="3,0 de 5 estrellas" />);
    expect(screen.getByText("3,0")).toBeInTheDocument();
  });

  it("muestra estrellas · score cuando hay score detallado", () => {
    renderWithIntl(<StarRatingValue stars="4.5" detailedScore={87} label="4,5 de 5 estrellas, 87 de 100" />);
    expect(screen.getByText("4,5 · 87")).toBeInTheDocument();
  });

  it("expone el valor como una única imagen accesible, con los glifos decorativos", () => {
    const { container } = renderWithIntl(
      <StarRatingValue stars="2.0" detailedScore={null} label="2,0 de 5 estrellas" />,
    );
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("img", { name: "2,0 de 5 estrellas" })).toBeInTheDocument();
    // cinco estrellas dibujadas, todas dentro del contenedor decorativo
    expect(container.querySelectorAll("svg")).toHaveLength(5);
  });

  it("dibuja media estrella: 3,5 → 3 llenas, 1 media y 1 vacía", () => {
    const { container } = renderWithIntl(
      <StarRatingValue stars="3.5" detailedScore={null} label="3,5 de 5 estrellas" />,
    );
    const widths = Array.from(container.querySelectorAll("svg rect")).map((rect) =>
      rect.getAttribute("width"),
    );
    expect(widths).toEqual(["24", "24", "24", "12", "0"]);
  });
});
