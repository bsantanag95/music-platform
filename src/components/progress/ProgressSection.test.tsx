import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ProgressSection, useProgressSection } from "./ProgressSection";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/me/progress",
}));
vi.mock("@/components/quick-actions/QuickActionsDialog", () => ({
  QuickActionsDialog: ({ initialAction }: { initialAction: string }) => (
    <div role="dialog" aria-label="Añadir" data-action={initialAction} />
  ),
}));

const totals = { discographies: 13, lists: 9, following: 0 };

function Reporter() {
  const { reportTotal } = useProgressSection();
  return (
    <button type="button" onClick={() => reportTotal("discographies", 12)}>
      informar
    </button>
  );
}

// openspec: redesign-progress-toolbar
describe("ProgressSection", () => {
  it("muestra las pestañas con su total y el nombre nuevo", () => {
    renderWithIntl(
      <ProgressSection activeTab="discographies" initialTotals={totals}>
        <p>panel</p>
      </ProgressSection>,
    );
    expect(screen.getByRole("heading", { name: "Progreso" })).toBeInTheDocument();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Discografías13",
      "Para completarListas para completar9",
      "Listas que sigo0",
    ]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("la acción de Discografías abre el diálogo en Completar discografía", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ProgressSection activeTab="discographies" initialTotals={totals}>
        <p>panel</p>
      </ProgressSection>,
    );
    await user.click(screen.getByRole("button", { name: "Completar discografía" }));
    expect(screen.getByRole("dialog", { name: "Añadir" })).toHaveAttribute("data-action", "journey");
  });

  it("la acción de Listas para completar abre el diálogo en Nueva lista para completar", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ProgressSection activeTab="lists" initialTotals={totals}>
        <p>panel</p>
      </ProgressSection>,
    );
    await user.click(screen.getByRole("button", { name: /Nueva lista para completar/ }));
    expect(screen.getByRole("dialog", { name: "Añadir" })).toHaveAttribute("data-action", "newCamino");
  });

  it("Listas que sigo enlaza al descubrimiento en lugar de crear", () => {
    renderWithIntl(
      <ProgressSection activeTab="following" initialTotals={totals}>
        <p>panel</p>
      </ProgressSection>,
    );
    expect(screen.queryByRole("button", { name: /^\+/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Descubrir listas para completar/ })).toHaveAttribute("href", "/caminos");
  });

  it("la pestaña activa actualiza su total", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ProgressSection activeTab="discographies" initialTotals={totals}>
        <Reporter />
      </ProgressSection>,
    );
    await user.click(screen.getByRole("button", { name: "informar" }));
    expect(screen.getAllByRole("tab")[0]).toHaveTextContent("Discografías12");
  });
});
