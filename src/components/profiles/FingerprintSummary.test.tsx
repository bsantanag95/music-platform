import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FingerprintSummary } from "./FingerprintSummary";

describe("FingerprintSummary", () => {
  it("no renderiza nada sin frases (spec taste-fingerprint, sin datos suficientes)", () => {
    const { container } = render(<FingerprintSummary summary={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza cada frase, sin gráficos ni cifras", () => {
    render(
      <FingerprintSummary
        summary={["Escucha sobre todo música de los 2010s", "Es un calificador exigente"]}
      />,
    );
    expect(screen.getByText("Escucha sobre todo música de los 2010s")).toBeInTheDocument();
    expect(screen.getByText("Es un calificador exigente")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
