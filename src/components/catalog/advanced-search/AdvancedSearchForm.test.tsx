import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

/** El selector de género consulta géneros con React Query (openspec: add-catalog-search-fields). */
function renderForm(ui: ReactElement) {
  return renderWithIntl(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: labels.submit }));
}

describe("AdvancedSearchForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Artistas: navega solo con los campos con valor, los países repetidos y sin nombre", () => {
    renderForm(<AdvancedSearchForm type="artist" query="" criteria={{ country: ["CL", "AR"] }} />);

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
    renderForm(<AdvancedSearchForm type="artist" query="" criteria={{ country: ["CL", "AR"] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar Chile" }));
    submit();

    expect(mockPush).toHaveBeenCalledWith("/search/advanced?type=artist&country=AR");
  });

  it("Álbumes: título y artista exactos y varios tipos", () => {
    renderForm(<AdvancedSearchForm type="album" query="" criteria={{}} />);

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
    renderForm(
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
    renderForm(<AdvancedSearchForm type="song" query="" criteria={{}} />);

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
    renderForm(
      <AdvancedSearchForm type="artist" query="" criteria={{ artistType: "group", country: ["CL"], beginFrom: 1980 }} />,
    );
    for (const legend of [labels.groups.identity, labels.groups.origin, labels.groups.period, labels.groups.catalog]) {
      expect(screen.getByRole("group", { name: legend })).toBeInTheDocument();
    }
    expect(screen.getByText("3 criterios")).toBeInTheDocument();
  });

  it("un rango invertido no navega y muestra el error bajo el campo", () => {
    renderForm(<AdvancedSearchForm type="artist" query="" criteria={{}} />);
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
    const { unmount } = renderForm(<AdvancedSearchForm type="album" query="" criteria={{}} />);
    fireEvent.change(screen.getAllByLabelText(labels.from)[0]!, { target: { value: "85" } });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(labels.errors.yearFormat);
    unmount();

    renderForm(<AdvancedSearchForm type="song" query="" criteria={{}} />);
    fireEvent.change(screen.getAllByLabelText(labels.to)[0]!, { target: { value: "7.30" } });
    submit();
    expect(screen.getByRole("alert")).toHaveTextContent(labels.errors.durationFormat);
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("campos del catálogo (openspec: add-catalog-search-fields)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Artistas: la etiqueta del año sigue al tipo y el rol aparece solo con Persona", () => {
    renderForm(<AdvancedSearchForm type="artist" query="" criteria={{}} />);

    expect(screen.getByRole("group", { name: labels.begin })).toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp(`^${labels.role}`))).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(labels.artistType), { target: { value: "person" } });
    expect(screen.getByRole("group", { name: labels.beginPerson })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(new RegExp(`^${labels.role}`)), { target: { value: "own" } });
    submit();
    expect(mockPush).toHaveBeenLastCalledWith("/search/advanced?type=artist&artistType=person&role=own");

    fireEvent.change(screen.getByLabelText(labels.artistType), { target: { value: "group" } });
    expect(screen.getByRole("group", { name: labels.beginGroup })).toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp(`^${labels.role}`))).not.toBeInTheDocument();
  });

  it("Artistas: grupo Del catálogo con su ayuda, actividad y premios", () => {
    renderForm(
      <AdvancedSearchForm
        type="artist"
        query=""
        criteria={{ award: "grammy" }}
        awards={[
          { slug: "grammy", kind: "competition" },
          { slug: "grammy-hall-of-fame", kind: "hall_of_fame" },
        ]}
      />,
    );

    const catalog = screen.getByRole("group", { name: labels.groups.catalog });
    expect(catalog).toHaveTextContent(labels.groups.catalogHint);
    fireEvent.change(screen.getAllByLabelText(labels.from)[1]!, { target: { value: "1980" } });
    fireEvent.change(screen.getAllByLabelText(labels.to)[1]!, { target: { value: "1990" } });
    fireEvent.click(screen.getByRole("checkbox", { name: labels.awardWon }));
    submit();

    expect(mockPush).toHaveBeenLastCalledWith(
      "/search/advanced?type=artist&activeFrom=1980&activeTo=1990&award=grammy&awardWon=1",
    );
  });

  it("Álbumes: el género elegido y los países del artista viajan en la URL", () => {
    renderForm(
      <AdvancedSearchForm type="album" query="" criteria={{ genre: "rock", artistCountry: ["CL"] }} genreName="Rock" />,
    );

    expect(screen.getByRole("button", { name: labels.genreRemove.replace("{genre}", "Rock") })).toBeInTheDocument();
    submit();

    expect(mockPush).toHaveBeenLastCalledWith("/search/advanced?type=album&genre=rock&artistCountry=CL");
  });
});
