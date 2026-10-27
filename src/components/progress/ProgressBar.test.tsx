import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ProgressBar, progressStep } from "./ProgressBar";

// openspec: refine-progress-page-phase1, D4
describe("ProgressBar", () => {
  it("convierte el avance en tramos discretos", () => {
    expect(progressStep(0, 6)).toBe("notStarted");
    expect(progressStep(1, 6)).toBe("justStarted");
    expect(progressStep(2, 6)).toBe("halfway");
    expect(progressStep(4, 6)).toBe("almostDone");
    expect(progressStep(6, 6)).toBe("complete");
    expect(progressStep(0, 0)).toBe("notStarted");
  });

  it("se anuncia sin números", () => {
    renderWithIntl(<ProgressBar listened={6} selected={6} />);
    const bar = screen.getByRole("img", { name: "Avance: completo" });
    expect(bar.getAttribute("aria-label")).not.toMatch(/\d/);
  });

  it("no dibuja nada con la selección vacía", () => {
    const { container } = renderWithIntl(<ProgressBar listened={0} selected={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
