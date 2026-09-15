import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ArtistJourneyManager } from "./ArtistJourneyManager";
import type { ArtistJourneyDetail } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setArtistJourneySelection: vi.fn(),
  archiveArtistJourney: vi.fn(),
  unarchiveArtistJourney: vi.fn(),
  deleteArtistJourney: vi.fn(),
  getArtistJourney: vi.fn(),
  createListenEntry: vi.fn(),
  deleteListenEntry: vi.fn(),
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
  setArtistJourneySelection: mocks.setArtistJourneySelection,
  archiveArtistJourney: mocks.archiveArtistJourney,
  unarchiveArtistJourney: mocks.unarchiveArtistJourney,
  deleteArtistJourney: mocks.deleteArtistJourney,
  getArtistJourney: mocks.getArtistJourney,
}));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));

const categoryLabels = {
  studio: "Estudio",
  single_ep: "Sencillos / EP",
  compilation: "Compilados",
  live_other: "En vivo / Misceláneo",
};

function journey(over: Partial<ArtistJourneyDetail> = {}): ArtistJourneyDetail {
  return {
    artistId: "artist-1",
    state: "in_progress",
    activatedAt: "2026-01-01T00:00:00.000Z",
    progress: { selectedCount: 1, listenedCount: 0 },
    albums: [
      { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: false },
      { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
      { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
    ],
    ...over,
  };
}

function listenEntry(albumId: string, over: Record<string, unknown> = {}) {
  return {
    id: `le-${albumId}`,
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "private",
    createdAt: "2026-01-01T00:00:00.000Z",
    target: { type: "release-group", id: albumId, title: "Studio One", subtitle: null, coverThumbUrl: null },
    ...over,
  };
}

const emptyJourney = () =>
  journey({
    progress: { selectedCount: 0, listenedCount: 0 },
    albums: [
      { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: false, listened: false },
      { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
      { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
    ],
  });

function renderManager(
  over: Partial<ArtistJourneyDetail> = {},
  props: { artistPhotoUrl?: string | null } = {},
) {
  return renderWithIntl(
    <ArtistJourneyManager
      artistId="artist-1"
      artistName="Deep Purple"
      artistPhotoUrl={props.artistPhotoUrl ?? null}
      initialJourney={journey(over)}
      categoryLabels={categoryLabels}
    />,
  );
}

async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Agregar o quitar álbumes" }));
}

describe("ArtistJourneyManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("con selección no vacía, el editor está oculto y se ve la vista de selección", () => {
    renderManager();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar o quitar álbumes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Studio One" })).toBeInTheDocument();
  });

  it("con selección vacía, el editor está abierto por defecto sin necesitar un clic", () => {
    renderManager(emptyJourney());
    expect(screen.getByRole("checkbox", { name: "Incluir Studio One en el recorrido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar o quitar álbumes" })).not.toBeInTheDocument();
  });

  it("expande estudio por defecto y colapsa el resto dentro del editor", async () => {
    const user = userEvent.setup();
    renderManager();
    await openEditor(user);
    expect(screen.getByText("Studio One")).toBeInTheDocument();
    expect(screen.queryByText("Live One")).not.toBeInTheDocument();
  });

  it("expande un grupo colapsado al activar su encabezado", async () => {
    const user = userEvent.setup();
    renderManager();
    await openEditor(user);
    await user.click(screen.getByRole("button", { name: /en vivo/i }));
    expect(screen.getByText("Live One")).toBeInTheDocument();
  });

  it("sin cambios, Guardar está deshabilitado pero muestra que no hay nada pendiente", () => {
    renderManager();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(screen.getByText("Sin cambios pendientes")).toBeInTheDocument();
  });

  it("al marcar un álbum en el editor, el aviso de 'sin cambios' desaparece", async () => {
    const user = userEvent.setup();
    renderManager();
    await openEditor(user);
    await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
    expect(screen.queryByText("Sin cambios pendientes")).not.toBeInTheDocument();
  });

  it("marcar un álbum habilita Guardar; guardar envía el conjunto final completo", async () => {
    const user = userEvent.setup();
    mocks.setArtistJourneySelection.mockResolvedValueOnce(
      journey({
        albums: [
          { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: false },
          { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: true, listened: false },
          { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
        ],
      }),
    );
    renderManager();
    await openEditor(user);
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(mocks.setArtistJourneySelection).toHaveBeenCalledWith("artist-1", expect.arrayContaining(["s1", "s2"]));
  });

  it("seleccionar todo un grupo marca todos sus álbumes sin llamar al servidor", async () => {
    const user = userEvent.setup();
    renderManager();
    await openEditor(user);
    const group = screen.getByText("Estudio").closest("div")!.parentElement!;
    await user.click(within(group).getByRole("checkbox", { name: /seleccionar todos/i }));
    expect(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" })).toBeChecked();
    expect(mocks.setArtistJourneySelection).not.toHaveBeenCalled();
  });

  it("ocultar el editor conserva el borrador sin descartarlo", async () => {
    const user = userEvent.setup();
    renderManager();
    await openEditor(user);
    await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
    await user.click(screen.getByRole("button", { name: "Ocultar" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Studio Two" })).toBeInTheDocument();
  });

  it("archivar y desarchivar alternan según el estado actual", async () => {
    const user = userEvent.setup();
    mocks.archiveArtistJourney.mockResolvedValueOnce(journey({ state: "archived" }));
    renderManager();
    await user.click(screen.getByRole("button", { name: "Archivar" }));
    expect(mocks.archiveArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(await screen.findByRole("button", { name: "Desarchivar" })).toBeInTheDocument();
  });

  it("borrar requiere confirmación y redirige al listado", async () => {
    const user = userEvent.setup();
    mocks.deleteArtistJourney.mockResolvedValueOnce(null);
    renderManager();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(mocks.deleteArtistJourney).toHaveBeenCalledWith("artist-1");
    expect(mocks.push).toHaveBeenCalledWith("/me/artist-journeys");
  });

  describe("vista de selección", () => {
    it("enlaza el título del álbum a su página y el nombre del artista a la suya", () => {
      renderManager();
      expect(screen.getByRole("link", { name: "Studio One" })).toHaveAttribute("href", "/album/s1");
      expect(screen.getByRole("link", { name: "Deep Purple" })).toHaveAttribute("href", "/artist/artist-1");
    });

    it("muestra la foto del artista cuando hay una registrada", () => {
      renderManager({}, { artistPhotoUrl: "https://example.com/photo.jpg" });
      expect(screen.getByAltText("Deep Purple")).toHaveAttribute("src", "https://example.com/photo.jpg");
    });

    it("sin foto registrada, muestra el reemplazo neutro", () => {
      renderManager();
      expect(screen.getByText("Sin foto disponible")).toBeInTheDocument();
    });

    it("orden alfabético reordena la selección", async () => {
      const user = userEvent.setup();
      renderManager({
        progress: { selectedCount: 2, listenedCount: 0 },
        albums: [
          { id: "s1", title: "Zeta", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: false },
          { id: "s2", title: "Alfa", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: true, listened: false },
        ],
      });
      await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "alpha");
      const titles = screen.getAllByRole("link", { name: /^(Zeta|Alfa)$/ }).map((el) => el.textContent);
      expect(titles).toEqual(["Alfa", "Zeta"]);
    });

    it("cambiar a modo gráfico sigue mostrando el álbum seleccionado", async () => {
      const user = userEvent.setup();
      renderManager();
      await user.click(screen.getByRole("radio", { name: "Gráfico" }));
      expect(screen.getByRole("link", { name: "Studio One" })).toBeInTheDocument();
    });

    it("quitar un álbum desde la vista de selección habilita Guardar sin llamar al servidor", async () => {
      const user = userEvent.setup();
      renderManager();
      await user.click(screen.getByRole("button", { name: "Quitar Studio One de la selección" }));
      expect(screen.queryByRole("link", { name: "Studio One" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
      expect(mocks.setArtistJourneySelection).not.toHaveBeenCalled();
    });

    it("quitar el último álbum sin guardar abre el editor en su lugar", async () => {
      const user = userEvent.setup();
      renderManager();
      await user.click(screen.getByRole("button", { name: "Quitar Studio One de la selección" }));
      expect(screen.getByRole("checkbox", { name: "Incluir Studio One en el recorrido" })).toBeInTheDocument();
    });
  });

  describe("registrar escucha", () => {
    it("registrar una escucha marca el álbum y actualiza progreso y estado sin recargar", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockResolvedValueOnce(listenEntry("s1"));
      mocks.getArtistJourney.mockResolvedValueOnce(
        journey({
          state: "complete",
          progress: { selectedCount: 1, listenedCount: 1 },
          albums: [
            { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: true },
            { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
            { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
          ],
        }),
      );
      renderManager();

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Studio One" }));

      expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: "s1" });
      expect(await screen.findByText("✓ Escuchado")).toBeInTheDocument();
      expect(screen.getByText("Completo")).toBeInTheDocument();
    });

    it("un álbum ya escuchado por una entrada previa (no rastreada en esta sesión) no ofrece registrar ni quitar", () => {
      renderManager({
        albums: [
          { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: true },
          { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
          { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
        ],
      });

      expect(screen.getByText("✓ Escuchado")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Registrar escucha de Studio One" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Quitar el registro de escucha de Studio One" })).not.toBeInTheDocument();
    });

    it("quitar el registro de una escucha creada en esta sesión revierte el álbum a no escuchado", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockResolvedValueOnce(listenEntry("s1"));
      mocks.getArtistJourney
        .mockResolvedValueOnce(
          journey({
            state: "complete",
            progress: { selectedCount: 1, listenedCount: 1 },
            albums: [
              { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: true },
              { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
              { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
            ],
          }),
        )
        .mockResolvedValueOnce(
          journey({
            albums: [
              { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: false },
              { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
              { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
            ],
          }),
        );
      mocks.deleteListenEntry.mockResolvedValueOnce(null);
      renderManager();

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Studio One" }));
      expect(await screen.findByText("✓ Escuchado")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Quitar el registro de escucha de Studio One" }));
      expect(mocks.deleteListenEntry).toHaveBeenCalledWith("le-s1");
      expect(await screen.findByRole("button", { name: "Registrar escucha de Studio One" })).toBeInTheDocument();
      expect(screen.queryByText("✓ Escuchado")).not.toBeInTheDocument();
      // Al perder la entrada rastreada, el panel de ampliación (que dependía
      // de ella) también deja de ofrecerse.
      expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    });

    it("tras registrar, el panel de ampliación se abre solo; Cerrar lo oculta y Ampliar lo reabre", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockResolvedValueOnce(listenEntry("s1"));
      mocks.getArtistJourney.mockResolvedValueOnce(
        journey({
          albums: [
            { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: true },
            { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: false, listened: false },
            { id: "l1", title: "Live One", category: "live_other", firstReleaseYear: 2000, coverThumbUrl: null, selected: false, listened: false },
          ],
        }),
      );
      renderManager();

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Studio One" }));
      expect(await screen.findByLabelText(/Impresión/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Cerrar" }));
      expect(screen.queryByLabelText(/Impresión/)).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Ampliar" }));
      expect(screen.getByLabelText(/Impresión/)).toBeInTheDocument();
      // Reabrir no vuelve a crear una entrada.
      expect(mocks.createListenEntry).toHaveBeenCalledTimes(1);
    });

    it("registrar otro álbum mientras hay un panel abierto no lo reemplaza en silencio", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry
        .mockResolvedValueOnce(listenEntry("s1"))
        .mockResolvedValueOnce(listenEntry("s2", { id: "le-s2" }));
      mocks.getArtistJourney
        .mockResolvedValueOnce(
          journey({
            progress: { selectedCount: 2, listenedCount: 1 },
            albums: [
              { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: true },
              { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: true, listened: false },
            ],
          }),
        )
        .mockResolvedValueOnce(
          journey({
            progress: { selectedCount: 2, listenedCount: 2 },
            albums: [
              { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: true },
              { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: true, listened: true },
            ],
          }),
        );
      renderManager({
        progress: { selectedCount: 2, listenedCount: 0 },
        albums: [
          { id: "s1", title: "Studio One", category: "studio", firstReleaseYear: 1990, coverThumbUrl: null, selected: true, listened: false },
          { id: "s2", title: "Studio Two", category: "studio", firstReleaseYear: 1995, coverThumbUrl: null, selected: true, listened: false },
        ],
      });

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Studio One" }));
      const studioOneRow = (await screen.findByRole("link", { name: "Studio One" })).closest("li")!;
      expect(within(studioOneRow).getByLabelText(/Impresión/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Studio Two" }));
      expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: "s2" });

      // El panel de Studio One sigue abierto y con su formulario, sin haber
      // sido reemplazado por el registro de Studio Two.
      expect(within(studioOneRow).getByLabelText(/Impresión/)).toBeInTheDocument();
      expect(within(studioOneRow).getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
      const studioTwoRow = screen.getByText("Studio Two").closest("li")!;
      expect(within(studioTwoRow).queryByLabelText(/Impresión/)).not.toBeInTheDocument();
      expect(within(studioTwoRow).getByRole("button", { name: "Ampliar" })).toBeInTheDocument();
    });

    it("un error al registrar muestra un aviso y no descarta el borrador de selección", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockRejectedValueOnce(new mocks.ApiError("INTERNAL_ERROR"));
      renderManager();
      await openEditor(user);
      await user.click(screen.getByRole("checkbox", { name: "Incluir Studio Two en el recorrido" }));
      await user.click(screen.getByRole("button", { name: "Ocultar" }));

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Studio One" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
      expect(mocks.getArtistJourney).not.toHaveBeenCalled();
    });

    it("el editor de selección no ofrece la acción de registrar escucha", async () => {
      const user = userEvent.setup();
      renderManager();
      await openEditor(user);
      expect(screen.queryByRole("button", { name: /Registrar escucha/ })).not.toBeInTheDocument();
    });
  });
});
