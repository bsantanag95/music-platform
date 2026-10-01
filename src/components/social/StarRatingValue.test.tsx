import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { StarRatingValue } from "./StarRatingValue";

describe("StarRatingValue", () => {
  it("sin puntaje muestra el número de estrellas", () => {
    renderWithIntl(<StarRatingValue stars="3.0" detailedScore={null} label="3,0 de 5 estrellas" showScore />);
    expect(screen.getByText("3,0")).toBeInTheDocument();
  });

  it("con puntaje y sin showScore muestra el número de estrellas, no el puntaje", () => {
    renderWithIntl(<StarRatingValue stars="4.5" detailedScore={87} label="4,5 de 5 estrellas" />);
    expect(screen.getByText("4,5")).toBeInTheDocument();
    expect(screen.queryByText("87/100")).not.toBeInTheDocument();
  });

  it("con puntaje y showScore muestra el puntaje en lugar del número de estrellas", () => {
    renderWithIntl(<StarRatingValue stars="4.5" detailedScore={87} label="4,5 de 5 estrellas, 87 de 100" showScore />);
    expect(screen.getByText("87/100")).toBeInTheDocument();
    expect(screen.queryByText("4,5")).not.toBeInTheDocument();
  });

  it("con showScore pero sin puntaje cae al número de estrellas", () => {
    renderWithIntl(<StarRatingValue stars="4.5" detailedScore={null} label="4,5 de 5 estrellas" showScore />);
    expect(screen.getByText("4,5")).toBeInTheDocument();
  });

  it("no colorea el número por valor: usa tono neutro con font-medium", () => {
    renderWithIntl(<StarRatingValue stars="1.0" detailedScore={5} label="1,0 de 5 estrellas, 5 de 100" showScore />);
    const number = screen.getByText("5/100");
    expect(number).toHaveClass("font-medium", "text-paper");
    expect(number).not.toHaveClass("text-amber");
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
