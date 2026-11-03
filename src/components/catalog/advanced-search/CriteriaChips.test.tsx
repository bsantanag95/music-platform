import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CriteriaChips } from "./CriteriaChips";
import { AdvancedEmpty, AlternativeCount } from "./AdvancedEmpty";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("CriteriaChips (openspec: refine-advanced-search-phase1)", () => {
  it("una pastilla por criterio, cada una enlaza a la búsqueda sin él", () => {
    renderWithIntl(
      <CriteriaChips type="artist" query="" criteria={{ artistType: "group", country: ["CL", "AR"], beginFrom: 1980, beginTo: 1989 }} />,
    );
    expect(screen.getByRole("link", { name: "Quitar Grupo" })).toHaveAttribute(
      "href",
      "/search/advanced?type=artist&country=CL&country=AR&beginFrom=1980&beginTo=1989",
    );
    expect(screen.getByRole("link", { name: "Quitar Chile" })).toHaveAttribute(
      "href",
      "/search/advanced?type=artist&artistType=group&country=AR&beginFrom=1980&beginTo=1989",
    );
    expect(screen.getByText("Inicio 1980–1989")).toBeInTheDocument();
  });

  it("textos, rangos abiertos y duración", () => {
    renderWithIntl(
      <CriteriaChips type="song" query="creep" criteria={{ exact: true, artist: "Radiohead", durMin: 420 }} />,
    );
    expect(screen.getByText("«creep» (exacto)")).toBeInTheDocument();
    expect(screen.getByText("Artista: Radiohead")).toBeInTheDocument();
    expect(screen.getByText("Duración desde 7:00")).toBeInTheDocument();
    // Quitar el título quita también su coincidencia exacta.
    expect(screen.getByRole("link", { name: "Quitar «creep» (exacto)" })).toHaveAttribute(
      "href",
      "/search/advanced?type=song&artist=Radiohead&durMin=420",
    );
  });
});

describe("AdvancedEmpty (openspec: refine-advanced-search-phase1)", () => {
  it("un enlace por criterio, con la cifra, y el nombre en la búsqueda rápida", () => {
    renderWithIntl(
      <AdvancedEmpty
        type="artist"
        query="zzqxv blorp"
        criteria={{ country: ["CL"] }}
        countOf={(chip) => <AlternativeCount count={chip.id === "q" ? 3120 : 0} />}
      />,
    );
    expect(screen.getByRole("link", { name: /Sin «zzqxv blorp».*3120 resultados/ })).toHaveAttribute(
      "href",
      "/search/advanced?type=artist&country=CL",
    );
    expect(screen.getByRole("link", { name: /Sin Chile.*ninguno/ })).toHaveAttribute(
      "href",
      "/search/advanced?type=artist&q=zzqxv+blorp",
    );
    expect(screen.getByRole("link", { name: /Buscar «zzqxv blorp» en la búsqueda rápida/ })).toHaveAttribute(
      "href",
      "/search?type=artist&q=zzqxv+blorp",
    );
  });

  it("con un único criterio ofrece Limpiar", () => {
    renderWithIntl(<AdvancedEmpty type="album" query="" criteria={{ yearFrom: 1901, yearTo: 1901 }} />);
    expect(screen.getByRole("link", { name: "Limpiar" })).toHaveAttribute("href", "/search/advanced?type=album");
    expect(screen.queryByText(/Sin /)).not.toBeInTheDocument();
  });
});
