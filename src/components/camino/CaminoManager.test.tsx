import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CaminoManager } from "./CaminoManager";
import type { CaminoDetail } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getMyCamino: vi.fn(),
  archiveCamino: vi.fn(),
  unarchiveCamino: vi.fn(),
  deleteCamino: vi.fn(),
  removeAlbumFromCamino: vi.fn(),
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
vi.mock("@/lib/api/camino", () => ({
  getMyCamino: mocks.getMyCamino,
  archiveCamino: mocks.archiveCamino,
  unarchiveCamino: mocks.unarchiveCamino,
  deleteCamino: mocks.deleteCamino,
  removeAlbumFromCamino: mocks.removeAlbumFromCamino,
}));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
}));

function listenEntry(albumId: string, over: Record<string, unknown> = {}) {
  return {
    id: `le-${albumId}`,
    listenContext: "first_listen",
    body: null,
    reaction: null,
    audience: "private",
    createdAt: "2026-01-01T00:00:00.000Z",
    target: { type: "release-group", id: albumId, title: "Loveless", subtitle: null, coverThumbUrl: null },
    ...over,
  };
}

function camino(over: Partial<CaminoDetail> = {}): CaminoDetail {
  return {
    id: "camino-1",
    title: "Shoegaze esencial",
    description: null,
    audience: "public",
    state: "in_progress",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: { selectedCount: 2, listenedCount: 0 },
    albums: [
      { id: "a1", title: "Loveless", artistName: "My Bloody Valentine", firstReleaseYear: 1991, coverThumbUrl: null, listened: false },
      { id: "a2", title: "Souvlaki", artistName: "Slowdive", firstReleaseYear: 1993, coverThumbUrl: null, listened: false },
    ],
    ...over,
  };
}

function renderManager(over: Partial<CaminoDetail> = {}) {
  return renderWithIntl(<CaminoManager initial={camino(over)} />);
}

describe("CaminoManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra título, estado y el artista de cada álbum", () => {
    renderManager();
    expect(screen.getByRole("heading", { name: "Shoegaze esencial" })).toBeInTheDocument();
    expect(screen.getByText("En curso")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Loveless" })).toHaveAttribute("href", "/album/a1");
    expect(screen.getByText("My Bloody Valentine")).toBeInTheDocument();
  });

  it("sin álbumes, muestra el estado vacío en vez de la lista", () => {
    renderManager({ progress: { selectedCount: 0, listenedCount: 0 }, albums: [] });
    expect(screen.getByText("Este Camino todavía no tiene álbumes.")).toBeInTheDocument();
  });

  it("archivar y desarchivar alternan según el estado actual", async () => {
    const user = userEvent.setup();
    mocks.archiveCamino.mockResolvedValueOnce(camino({ state: "archived" }));
    renderManager();
    await user.click(screen.getByRole("button", { name: "Archivar" }));
    expect(mocks.archiveCamino).toHaveBeenCalledWith("camino-1");
    expect(await screen.findByRole("button", { name: "Desarchivar" })).toBeInTheDocument();
  });

  it("borrar requiere confirmación y redirige al listado", async () => {
    const user = userEvent.setup();
    mocks.deleteCamino.mockResolvedValueOnce(null);
    renderManager();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar eliminación" }));
    expect(mocks.deleteCamino).toHaveBeenCalledWith("camino-1");
    expect(mocks.push).toHaveBeenCalledWith("/me/caminos");
  });

  it("cancelar la confirmación de borrado no elimina nada", async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mocks.deleteCamino).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("quitar un álbum llama a la API y refleja el resultado", async () => {
    const user = userEvent.setup();
    mocks.removeAlbumFromCamino.mockResolvedValueOnce(
      camino({ progress: { selectedCount: 1, listenedCount: 0 }, albums: [camino().albums[1]!] }),
    );
    renderManager();
    await user.click(screen.getByRole("button", { name: "Quitar Loveless del Camino" }));
    expect(mocks.removeAlbumFromCamino).toHaveBeenCalledWith("camino-1", "a1");
    expect(await screen.findByRole("link", { name: "Souvlaki" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Loveless" })).not.toBeInTheDocument();
  });

  it("orden alfabético reordena los álbumes", async () => {
    const user = userEvent.setup();
    renderManager({
      albums: [
        { id: "a1", title: "Zeta", artistName: null, firstReleaseYear: 1990, coverThumbUrl: null, listened: false },
        { id: "a2", title: "Alfa", artistName: null, firstReleaseYear: 1995, coverThumbUrl: null, listened: false },
      ],
    });
    await user.selectOptions(screen.getByRole("combobox", { name: "Ordenar" }), "alpha");
    const titles = screen.getAllByRole("link", { name: /^(Zeta|Alfa)$/ }).map((el) => el.textContent);
    expect(titles).toEqual(["Alfa", "Zeta"]);
  });

  describe("registrar escucha", () => {
    it("registrar una escucha marca el álbum y refresca el progreso", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockResolvedValueOnce(listenEntry("a1"));
      mocks.getMyCamino.mockResolvedValueOnce(
        camino({
          state: "in_progress",
          progress: { selectedCount: 2, listenedCount: 1 },
          albums: [
            { id: "a1", title: "Loveless", artistName: "My Bloody Valentine", firstReleaseYear: 1991, coverThumbUrl: null, listened: true },
            { id: "a2", title: "Souvlaki", artistName: "Slowdive", firstReleaseYear: 1993, coverThumbUrl: null, listened: false },
          ],
        }),
      );
      renderManager();

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Loveless" }));

      expect(mocks.createListenEntry).toHaveBeenCalledWith({ type: "release-group", id: "a1" });
      expect(await screen.findByText("✓ Escuchado")).toBeInTheDocument();
      expect(mocks.getMyCamino).toHaveBeenCalledWith("camino-1");
    });

    it("quitar el registro de una escucha creada en esta sesión la revierte", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockResolvedValueOnce(listenEntry("a1"));
      mocks.getMyCamino
        .mockResolvedValueOnce(
          camino({
            progress: { selectedCount: 2, listenedCount: 1 },
            albums: [
              { id: "a1", title: "Loveless", artistName: "My Bloody Valentine", firstReleaseYear: 1991, coverThumbUrl: null, listened: true },
              { id: "a2", title: "Souvlaki", artistName: "Slowdive", firstReleaseYear: 1993, coverThumbUrl: null, listened: false },
            ],
          }),
        )
        .mockResolvedValueOnce(camino());
      mocks.deleteListenEntry.mockResolvedValueOnce(null);
      renderManager();

      await user.click(screen.getByRole("button", { name: "Registrar escucha de Loveless" }));
      expect(await screen.findByText("✓ Escuchado")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Quitar el registro de escucha de Loveless" }));
      expect(mocks.deleteListenEntry).toHaveBeenCalledWith("le-a1");
      expect(await screen.findByRole("button", { name: "Registrar escucha de Loveless" })).toBeInTheDocument();
    });

    it("un error al registrar muestra un aviso", async () => {
      const user = userEvent.setup();
      mocks.createListenEntry.mockRejectedValueOnce(new mocks.ApiError("INTERNAL_ERROR"));
      renderManager();
      await user.click(screen.getByRole("button", { name: "Registrar escucha de Loveless" }));
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(mocks.getMyCamino).not.toHaveBeenCalled();
    });
  });
});
