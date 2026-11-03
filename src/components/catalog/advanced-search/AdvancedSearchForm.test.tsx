import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../messages/es/catalog.json";
import { AdvancedSearchForm } from "./AdvancedSearchForm";

const mockPush = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const labels = catalogEs.search.advanced;

function submit() {
  fireEvent.click(screen.getByRole("button", { name: labels.submit }));
}

describe("AdvancedSearchForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Artistas: navega solo con los campos con valor, los países repetidos y sin nombre", () => {
    renderWithIntl(<AdvancedSearchForm type="artist" query="" criteria={{ country: ["CL", "AR"] }} />);

    fireEvent.change(screen.getByLabelText(labels.artistType), { target: { value: "group" } });
    fireEvent.change(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "1980" } });
    // La casilla exacta sin nombre no llega a la URL.
    fireEvent.click(screen.getByRole("checkbox", { name: `Coincidencia exacta en ${labels.name}` }));
    submit();

    expect(mockPush).toHaveBeenCalledWith(
      "/search/advanced?type=artist&artistType=group&country=CL&country=AR&beginFrom=1980",
    );
  });

  it("los países elegidos son etiquetas que se quitan", () => {
    renderWithIntl(<AdvancedSearchForm type="artist" query="" criteria={{ country: ["CL", "AR"] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar Chile" }));
    submit();

    expect(mockPush).toHaveBeenCalledWith("/search/advanced?type=artist&country=AR");
  });

  it("Álbumes: título y artista exactos y varios tipos", () => {
    renderWithIntl(<AdvancedSearchForm type="album" query="" criteria={{}} />);

    fireEvent.change(screen.getByLabelText(labels.artist), { target: { value: " Iron Maiden " } });
    fireEvent.click(screen.getByRole("checkbox", { name: `Coincidencia exacta en ${labels.artist}` }));
    fireEvent.click(screen.getByRole("checkbox", { name: catalogEs.artist.categories.studio }));
    fireEvent.click(screen.getByRole("checkbox", { name: catalogEs.artist.categories.live_other }));
    submit();

    expect(mockPush).toHaveBeenCalledWith(
      "/search/advanced?type=album&artist=Iron+Maiden&artistExact=1&category=studio&category=live_other",
    );
  });

  it("Canciones: la duración en m:ss viaja en segundos y prellena desde la URL", () => {
    renderWithIntl(
      <AdvancedSearchForm type="song" query="hallelujah" criteria={{ album: "Grace", durMax: 420 }} />,
    );

    expect(screen.getByLabelText(labels.songTitle)).toHaveValue("hallelujah");
    expect(screen.getByLabelText(labels.album)).toHaveValue("Grace");
    expect(screen.getAllByLabelText(labels.to)[0]).toHaveValue("7:00");
    fireEvent.change(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "3:30" } });
    submit();

    expect(mockPush).toHaveBeenCalledWith("/search/advanced?type=song&q=hallelujah&album=Grace&durMin=210&durMax=420");
  });

  it("sin JavaScript: formulario GET con los nombres de la URL; Limpiar vuelve a la pestaña vacía", () => {
    renderWithIntl(<AdvancedSearchForm type="song" query="" criteria={{}} />);

    const form = screen.getByRole("form", { name: "Buscar Canciones" });
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/search/advanced");
    for (const name of ["type", "q", "exact", "artist", "artistExact", "album", "albumExact", "category", "durMin", "durMax"]) {
      expect(form.querySelector(`[name="${name}"]`), name).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: labels.clear })).toHaveAttribute("href", "/search/advanced?type=song");
  });
});

describe("formulario agrupado y validación (openspec: refine-advanced-search-phase2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Artistas: grupos Identidad, Origen y Época y la cantidad de criterios de la URL", () => {
    renderWithIntl(
      <AdvancedSearchForm type="artist" query="" criteria={{ artistType: "group", country: ["CL"], beginFrom: 1980 }} />,
    );
    for (const legend of [labels.groups.identity, labels.groups.origin, labels.groups.period]) {
      expect(screen.getByRole("group", { name: legend })).toBeInTheDocument();
    }
    expect(screen.getByText("3 criterios")).toBeInTheDocument();
  });

  it("un rango invertido no navega y muestra el error bajo el campo", () => {
    renderWithIntl(<AdvancedSearchForm type="artist" query="" criteria={{}} />);
    fireEvent.change(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "1990" } });
    fireEvent.change(screen.getAllByLabelText(labels.to)[0]!, { target: { value: "1980" } });
    submit();

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(labels.errors.rangeOrder);
    expect(screen.getAllByLabelText(labels.from)[0]).toHaveAttribute("aria-invalid", "true");

    // Al corregir, el error se va y la búsqueda sale.
    fireEvent.input(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "1975" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    submit();
    expect(mockPush).toHaveBeenCalledWith("/search/advanced?type=artist&beginFrom=1975&beginTo=1980");
  });

  it("un año que no tiene 4 dígitos y una duración mal escrita", () => {
    const { unmount } = renderWithIntl(<AdvancedSearchForm type="album" query="" criteria={{}} />);
    fireEvent.change(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "85" } });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(labels.errors.yearFormat);
    unmount();

    renderWithIntl(<AdvancedSearchForm type="song" query="" criteria={{}} />);
    fireEvent.change(screen.getAllByLabelText(labels.to)[0]!, { target: { value: "7.30" } });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(labels.errors.durationFormat);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
