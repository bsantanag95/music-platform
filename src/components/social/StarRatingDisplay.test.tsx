import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StarRatingDisplay } from "./StarRatingDisplay";

describe("StarRatingDisplay", () => {
  it("es una sola imagen accesible con el valor, sin controles", () => {
    render(<StarRatingDisplay value={3.5} label="Tu nota: 3,5 estrellas" />);
    expect(screen.getByRole("img", { name: "Tu nota: 3,5 estrellas" })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("dibuja cinco estrellas con media estrella rellena a la mitad", () => {
    const { container } = render(<StarRatingDisplay value={3.5} label="3,5" />);
    const widths = [...container.querySelectorAll("rect")].map((rect) => rect.getAttribute("width"));
    expect(container.querySelectorAll("svg")).toHaveLength(5);
    expect(widths).toEqual(["24", "24", "24", "12", "0"]);
  });
});
