import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkTypeBadge } from "./WorkTypeBadge";

const labels = {
  compilation: "Recopilación",
  live_other: "En vivo",
  single_ep: "Single / EP",
} as const;

describe("WorkTypeBadge", () => {
  it("no renderiza nada para un álbum de estudio", () => {
    const { container } = render(<WorkTypeBadge category="studio" labels={labels} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza la etiqueta localizada para una recopilación", () => {
    render(<WorkTypeBadge category="compilation" labels={labels} />);
    expect(screen.getByText("Recopilación")).toBeInTheDocument();
  });

  it("renderiza la etiqueta localizada para un disco en vivo", () => {
    render(<WorkTypeBadge category="live_other" labels={labels} />);
    expect(screen.getByText("En vivo")).toBeInTheDocument();
  });
});
