import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FavoritePicker } from "./FavoritePicker";
import type { Favorite } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { getMyFavorites: vi.fn(), ApiError };
});

vi.mock("@/lib/api/favorites", () => ({ getMyFavorites: mocks.getMyFavorites }));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const fav = (id: string, title: string, over: Partial<Favorite> = {}): Favorite => ({
  id: `f-${id}`,
  targetType: "release-group",
  audience: "public",
  createdAt: "2026-01-01T00:00:00Z",
  target: { id, title, coverThumbUrl: null, artistName: "Slowdive", artistId: null },
  ...over,
});

const page = (favorites: Favorite[], hasNext = false) => ({
  favorites,
  page: 1,
  pageSize: 50,
  hasNext,
  counts: { artist: 0, "release-group": favorites.length, recording: 0 },
});

const baseProps = { summary: "Elegir", emptyLabel: "No tenés favoritos.", onPick: vi.fn() };

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Elegir"));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMyFavorites.mockResolvedValue(page([fav("a", "Souvlaki"), fav("b", "Just for a Day")]));
});

afterEach(() => vi.useRealTimers());

describe("FavoritePicker", () => {
  it("no consulta nada hasta que se abre el desplegable", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FavoritePicker {...baseProps} />);
    expect(mocks.getMyFavorites).not.toHaveBeenCalled();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await open(user);

    await screen.findByText("Souvlaki");
    expect(mocks.getMyFavorites).toHaveBeenCalledTimes(1);
    expect(mocks.getMyFavorites).toHaveBeenCalledWith(1, 50, {});
  });

  it("pide solo el tipo indicado", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FavoritePicker {...baseProps} type="release-group" />);
    await open(user);
    await screen.findByText("Souvlaki");
    expect(mocks.getMyFavorites).toHaveBeenCalledWith(1, 50, { type: "release-group" });
  });

  it("escribir busca en el servidor con debounce y un solo pedido por pausa", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithIntl(<FavoritePicker {...baseProps} type="release-group" />);
    await open(user);
    await screen.findByText("Souvlaki");
    mocks.getMyFavorites.mockClear();
    mocks.getMyFavorites.mockResolvedValue(page([fav("a", "Souvlaki")]));

    await user.type(screen.getByRole("searchbox", { name: "Buscar en tus favoritos" }), "sou");
    expect(mocks.getMyFavorites).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });

    await waitFor(() => expect(mocks.getMyFavorites).toHaveBeenCalledTimes(1));
    expect(mocks.getMyFavorites).toHaveBeenCalledWith(1, 50, { q: "sou", type: "release-group" });
    await waitFor(() => expect(screen.queryByText("Just for a Day")).not.toBeInTheDocument());
    expect(screen.getByText("Souvlaki")).toBeInTheDocument();
  });

  it("vaciar el buscador vuelve a pedir la lista completa sin q", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FavoritePicker {...baseProps} />);
    await open(user);
    await screen.findByText("Souvlaki");
    const input = screen.getByRole("searchbox");
    await user.type(input, "x");
    await waitFor(() => expect(mocks.getMyFavorites).toHaveBeenLastCalledWith(1, 50, { q: "x" }));

    await user.clear(input);

    await waitFor(() => expect(mocks.getMyFavorites).toHaveBeenLastCalledWith(1, 50, {}));
  });

  it("sin coincidencias avisa con el texto buscado", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FavoritePicker {...baseProps} />);
    await open(user);
    await screen.findByText("Souvlaki");
    mocks.getMyFavorites.mockResolvedValue(page([]));

    await user.type(screen.getByRole("searchbox"), "zzz");

    expect(await screen.findByText("Ningún favorito coincide con «zzz».")).toBeInTheDocument();
  });

  it("sin ningún favorito muestra el aviso del editor, no el de búsqueda", async () => {
    const user = userEvent.setup();
    mocks.getMyFavorites.mockResolvedValue(page([]));
    renderWithIntl(<FavoritePicker {...baseProps} />);
    await open(user);
    expect(await screen.findByText("No tenés favoritos.")).toBeInTheDocument();
  });

  it("no ofrece los ids excluidos", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FavoritePicker {...baseProps} excludeIds={new Set(["a"])} />);
    await open(user);
    await screen.findByText("Just for a Day");
    expect(screen.queryByText("Souvlaki")).not.toBeInTheDocument();
  });

  it("elegir un favorito llama a onPick con ese favorito", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    renderWithIntl(<FavoritePicker {...baseProps} onPick={onPick} />);
    await open(user);

    await user.click(await screen.findByText("Just for a Day"));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]![0]).toMatchObject({ id: "f-b", target: { id: "b" } });
  });

  it("con más favoritos de los que caben invita a buscar", async () => {
    const user = userEvent.setup();
    mocks.getMyFavorites.mockResolvedValue(page([fav("a", "Souvlaki")], true));
    renderWithIntl(<FavoritePicker {...baseProps} />);
    await open(user);
    expect(await screen.findByText(/Mostrando los primeros 50/)).toBeInTheDocument();
  });

  it("un error de la API se muestra localizado", async () => {
    const user = userEvent.setup();
    mocks.getMyFavorites.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "boom"));
    renderWithIntl(<FavoritePicker {...baseProps} />);
    await open(user);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("ignora una respuesta vieja que llega después de una búsqueda más nueva", async () => {
    const user = userEvent.setup();
    renderWithIntl(<FavoritePicker {...baseProps} />);
    await open(user);
    await screen.findByText("Souvlaki");

    let releaseOld: (value: unknown) => void = () => {};
    mocks.getMyFavorites.mockImplementationOnce(() => new Promise((resolve) => (releaseOld = resolve)));
    mocks.getMyFavorites.mockImplementationOnce(() => Promise.resolve(page([fav("c", "Nuevo resultado")])));
    const input = screen.getByRole("searchbox");
    await user.type(input, "a");
    await waitFor(() => expect(mocks.getMyFavorites).toHaveBeenCalledTimes(2));
    await user.type(input, "b");
    expect(await screen.findByText("Nuevo resultado")).toBeInTheDocument();

    await act(async () => releaseOld(page([fav("z", "Resultado viejo")])));

    expect(screen.queryByText("Resultado viejo")).not.toBeInTheDocument();
    expect(screen.getByText("Nuevo resultado")).toBeInTheDocument();
  });
});
