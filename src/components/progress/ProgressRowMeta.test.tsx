import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ProgressRowMeta } from "./ProgressRowMeta";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const nextUp = { id: "00000000-0000-4000-8000-000000000001", title: "Hysteria", artistName: "Def Leppard", year: 1987 };

// openspec: redesign-progress-views, D2
describe("ProgressRowMeta", () => {
  it("en curso nombra el siguiente disco y la última escucha, sin contar lo que falta", () => {
    renderWithIntl(
      <ProgressRowMeta
        nextUp={nextUp}
        lastListenedAt="2026-01-01T00:00:00.000Z"
        selectedCount={12}
        complete={false}
        emptyLabel="vacía"
      />,
    );
    expect(screen.getByText("Siguiente:", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hysteria" })).toBeInTheDocument();
    expect(screen.getByText(/Última escucha/)).toBeInTheDocument();
    expect(screen.queryByText(/12/)).not.toBeInTheDocument();
  });

  it("completa no propone siguiente", () => {
    renderWithIntl(
      <ProgressRowMeta nextUp={null} lastListenedAt={null} selectedCount={3} complete emptyLabel="vacía" />,
    );
    expect(screen.queryByText(/Siguiente/)).not.toBeInTheDocument();
    expect(screen.getByText("Sin escuchas todavía")).toBeInTheDocument();
  });

  it("una selección vacía muestra el texto de la pestaña", () => {
    renderWithIntl(
      <ProgressRowMeta nextUp={null} lastListenedAt={null} selectedCount={0} complete={false} emptyLabel="Vacía" />,
    );
    expect(screen.getByText("Vacía")).toBeInTheDocument();
    expect(screen.queryByText("Sin escuchas todavía")).not.toBeInTheDocument();
  });
});
