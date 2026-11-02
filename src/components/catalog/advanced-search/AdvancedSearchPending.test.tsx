import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AdvancedSearchPendingProvider, PendingResults, useAdvancedSearchTransition } from "./AdvancedSearchPending";

function Submitter({ wait }: { wait: Promise<void> }) {
  const [isPending, startTransition] = useAdvancedSearchTransition();
  return (
    <button type="button" disabled={isPending} onClick={() => startTransition(() => wait)}>
      Buscar
    </button>
  );
}

describe("AdvancedSearchPending (openspec: speed-up-search)", () => {
  it("un envío en curso deshabilita el botón y atenúa los resultados anteriores hasta que termina", async () => {
    let finish!: () => void;
    const wait = new Promise<void>((resolve) => {
      finish = resolve;
    });
    render(
      <AdvancedSearchPendingProvider>
        <Submitter wait={wait} />
        <PendingResults label="Resultados">
          <p>Anteriores</p>
        </PendingResults>
      </AdvancedSearchPendingProvider>,
    );
    const results = screen.getByRole("region", { name: "Resultados" });
    expect(results).not.toHaveAttribute("aria-busy");

    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
    expect(results).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      finish();
      await wait;
    });
    expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled();
    expect(results).not.toHaveAttribute("aria-busy");
  });
});
