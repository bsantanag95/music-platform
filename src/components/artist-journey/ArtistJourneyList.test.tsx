import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistJourneyList } from "./ArtistJourneyList";
import type { ArtistJourneySummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  deleteArtistJourney: vi.fn(),
  archiveArtistJourney: vi.fn(),
  unarchiveArtistJourney: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  },
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt={props.alt as string} />,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));
vi.mock("@/lib/api/artist-journeys", () => ({
  deleteArtistJourney: mocks.deleteArtistJourney,
  archiveArtistJourney: mocks.archiveArtistJourney,
  unarchiveArtistJourney: mocks.unarchiveArtistJourney,
}));

function summary(over: Partial<ArtistJourneySummary> = {}): ArtistJourneySummary {
  return {
    artistId: "artist-1",
    artistName: "Deep Purple",
    artistPhotoUrl: null,
    state: "in_progress",
    progress: { selectedCount: 4, listenedCount: 2 },
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("ArtistJourneyList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("estado vacío sin recorridos, sin buscador ni conmutador de vista", () => {
    renderWithIntl(<ArtistJourneyList journeys={[]} />);
    expect(screen.getByText("Todavía no armaste ningún recorrido.")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("modo Detallada por defecto: enlace principal a la gestión y menú '⋮' con las acciones secundarias", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    expect(screen.getByRole("radio", { name: /Detallada/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: "Deep Purple" })).toHaveAttribute(
      "href",
      "/me/artist-journeys/artist-1",
    );
    await user.click(screen.getByRole("button", { name: "Más acciones para Deep Purple" }));
    expect(screen.getByRole("menuitem", { name: "Ver artista" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Archivar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("modo Detallada muestra progreso discreto (sin fracción numérica) y última actualización", () => {
    renderWithIntl(
      <ArtistJourneyList
        journeys={[summary({ progress: { selectedCount: 4, listenedCount: 2 } })]}
      />,
    );
    expect(screen.getByText("Actualizado")).toBeInTheDocument();
    // §6.4.1: nunca "X de Y" fuera de la página de gestión.
    expect(screen.queryByText(/4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/escuchados/)).not.toBeInTheDocument();
  });

  it("modo Índice se mantiene compacto, sin progreso ni fecha", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await user.click(screen.getByRole("radio", { name: /Índice/i }));
    expect(screen.queryByText("Actualizado")).not.toBeInTheDocument();
  });

  it("el buscador filtra por nombre de artista", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[summary({ artistId: "a1", artistName: "Deep Purple" }), summary({ artistId: "a2", artistName: "Sabrina Carpenter" })]}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "sabrina");
    expect(screen.getByRole("link", { name: "Sabrina Carpenter" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Deep Purple" })).not.toBeInTheDocument();
  });

  it("el buscador ignora diacríticos: sin tilde encuentra un nombre con tilde y viceversa", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[summary({ artistId: "a1", artistName: "Mötley Crüe" }), summary({ artistId: "a2", artistName: "Deep Purple" })]}
      />,
    );
    await user.type(screen.getByRole("searchbox"), "motley crue");
    expect(screen.getByRole("link", { name: "Mötley Crüe" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Deep Purple" })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "mötley");
    expect(screen.getByRole("link", { name: "Mötley Crüe" })).toBeInTheDocument();
  });

  it("una búsqueda sin coincidencias muestra el estado sin resultados", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await user.type(screen.getByRole("searchbox"), "no existe");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("cambiar a modo Índice sigue mostrando los mismos recorridos", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await user.click(screen.getByRole("radio", { name: /Índice/i }));
    expect(screen.getByRole("radio", { name: /Índice/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("link", { name: "Deep Purple" })).toBeInTheDocument();
  });

  it("cambiar a modo Gráfico sigue mostrando los mismos recorridos", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await user.click(screen.getByRole("radio", { name: /Gráfico/i }));
    expect(screen.getByRole("radio", { name: /Gráfico/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("link", { name: "Deep Purple" }).length).toBeGreaterThan(0);
  });

  function names() {
    return screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/me/artist-journeys/"))
      .map((link) => link.textContent);
  }

  it("por defecto respeta el orden de agregado (más reciente primero, como llega del servidor)", () => {
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Sabrina Carpenter" }),
          summary({ artistId: "a2", artistName: "Deep Purple" }),
        ]}
      />,
    );
    expect(names()).toEqual(["Sabrina Carpenter", "Deep Purple"]);
  });

  it("el orden alfabético reordena por nombre de artista", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Sabrina Carpenter" }),
          summary({ artistId: "a2", artistName: "Deep Purple" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "alpha");
    expect(names()).toEqual(["Deep Purple", "Sabrina Carpenter"]);
  });

  it("el orden por estado agrupa en curso, completo y archivado, en ese orden", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Archivado Artist", state: "archived" }),
          summary({ artistId: "a2", artistName: "Completo Artist", state: "complete" }),
          summary({ artistId: "a3", artistName: "Curso Artist", state: "in_progress" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "state");
    expect(names()).toEqual(["Curso Artist", "Completo Artist", "Archivado Artist"]);
  });

  it("el orden por estado conserva el orden de agregado dentro de un mismo estado", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Sabrina Carpenter", state: "in_progress" }),
          summary({ artistId: "a2", artistName: "Deep Purple", state: "in_progress" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "state");
    expect(names()).toEqual(["Sabrina Carpenter", "Deep Purple"]);
  });

  it("el filtro de estado muestra solo los recorridos en ese estado", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Archivado Artist", state: "archived" }),
          summary({ artistId: "a2", artistName: "Completo Artist", state: "complete" }),
          summary({ artistId: "a3", artistName: "Curso Artist", state: "in_progress" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "archived");
    expect(names()).toEqual(["Archivado Artist"]);
  });

  it("el filtro de estado en 'Todo' (por defecto) muestra los tres estados", () => {
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Archivado Artist", state: "archived" }),
          summary({ artistId: "a2", artistName: "Completo Artist", state: "complete" }),
          summary({ artistId: "a3", artistName: "Curso Artist", state: "in_progress" }),
        ]}
      />,
    );
    expect(names()).toHaveLength(3);
  });

  it("el filtro de estado se combina con la búsqueda y el orden", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Sabrina Carpenter", state: "in_progress" }),
          summary({ artistId: "a2", artistName: "Deep Purple", state: "in_progress" }),
          summary({ artistId: "a3", artistName: "Iron Maiden", state: "archived" }),
        ]}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Estado" }), "in_progress");
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "alpha");
    expect(names()).toEqual(["Deep Purple", "Sabrina Carpenter"]);
  });

  async function openCardMenu(user: ReturnType<typeof userEvent.setup>, artist = "Deep Purple") {
    await user.click(screen.getByRole("button", { name: `Más acciones para ${artist}` }));
  }

  it("'Ver artista' del menú navega a la página del artista", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await openCardMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Ver artista" }));
    expect(mocks.push).toHaveBeenCalledWith("/artist/artist-1");
  });

  it("el menú archiva y desarchiva el recorrido", async () => {
    const user = userEvent.setup();
    mocks.archiveArtistJourney.mockResolvedValueOnce({ state: "archived" });
    renderWithIntl(<ArtistJourneyList journeys={[summary({ state: "in_progress" })]} />);
    await openCardMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Archivar" }));
    expect(mocks.archiveArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(await screen.findByText("Archivado", { selector: "span" })).toBeInTheDocument();

    mocks.unarchiveArtistJourney.mockResolvedValueOnce({ state: "in_progress" });
    await openCardMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Desarchivar" }));
    expect(mocks.unarchiveArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(await screen.findByText("En curso", { selector: "span" })).toBeInTheDocument();
  });

  it("eliminar desde el menú pide confirmación en la entrada antes de borrar, y la quita de la vista", async () => {
    const user = userEvent.setup();
    mocks.deleteArtistJourney.mockResolvedValueOnce(null);
    renderWithIntl(
      <ArtistJourneyList
        journeys={[
          summary({ artistId: "a1", artistName: "Deep Purple" }),
          summary({ artistId: "a2", artistName: "Sabrina Carpenter" }),
        ]}
      />,
    );
    await openCardMenu(user, "Deep Purple");
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    expect(mocks.deleteArtistJourney).not.toHaveBeenCalled();
    expect(screen.getByText("¿Eliminar?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
    expect(mocks.deleteArtistJourney).toHaveBeenCalledWith("a1");
    expect(await screen.findByRole("link", { name: "Sabrina Carpenter" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Deep Purple" })).not.toBeInTheDocument();
  });

  it("borrar el último recorrido de la lista muestra el estado vacío", async () => {
    const user = userEvent.setup();
    mocks.deleteArtistJourney.mockResolvedValueOnce(null);
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await openCardMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
    expect(await screen.findByText("Todavía no armaste ningún recorrido.")).toBeInTheDocument();
  });

  it("un error al eliminar muestra un aviso y conserva la entrada", async () => {
    const user = userEvent.setup();
    mocks.deleteArtistJourney.mockRejectedValueOnce(new mocks.ApiError("INTERNAL_ERROR"));
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await openCardMenu(user);
    await user.click(screen.getByRole("menuitem", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
    expect(await screen.findByText("No pudimos eliminar el recorrido. Intentá de nuevo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Deep Purple" })).toBeInTheDocument();
  });

  it("en modo Gráfico, el mismo menú de tarjeta sigue disponible", async () => {
    const user = userEvent.setup();
    renderWithIntl(<ArtistJourneyList journeys={[summary()]} />);
    await user.click(screen.getByRole("radio", { name: /Gráfico/i }));
    await openCardMenu(user);
    expect(screen.getByRole("menuitem", { name: "Ver artista" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Archivar" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument();
  });
});
