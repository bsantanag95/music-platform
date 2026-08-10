import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistMemberships } from "./ArtistMemberships";

vi.mock("@/i18n/navigation", () => ({ Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

describe("ArtistMemberships", () => {
  it("muestra rol, período y enlace locale-aware al perfil", () => {
    renderWithIntl(<ArtistMemberships memberships={[{ artistId: "person-1", name: "Roger Waters", type: "person", role: "bass", joinedOn: "1965", leftOn: null }]} heading="Integrantes" roleLabel="Rol" periodLabel="Período" openPeriod="hasta hoy" unknownPeriod="Desconocido" />);
    expect(screen.getByRole("link", { name: "Roger Waters" })).toHaveAttribute("href", "/artist/person-1");
    expect(screen.getByText(/Rol: bass/)).toBeInTheDocument();
    expect(screen.getByText(/1965/)).toBeInTheDocument();
  });

  it("no renderiza una sección vacía", () => {
    const { container } = renderWithIntl(<ArtistMemberships memberships={[]} heading="Integrantes" roleLabel="Rol" periodLabel="Período" openPeriod="hasta hoy" unknownPeriod="Desconocido" />);
    expect(container).toBeEmptyDOMElement();
  });
});
