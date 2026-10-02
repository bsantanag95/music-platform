import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { OwnerMusicIdentityEditor } from "./OwnerMusicIdentityEditor";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
// La búsqueda de géneros (selector) devuelve sugerencias fijas; guardar usa apiFetch.
vi.mock("@/lib/api/genres", () => ({
  searchGenres: vi.fn(async () => ({
    genres: [
      { slug: "jazz", name: "jazz", nameEs: null },
      { slug: "rock", name: "rock", nameEs: null },
      { slug: "pop", name: "pop", nameEs: null },
    ],
  })),
}));

const empty = { selfRoles: [], genres: [], listeningFormats: [] };

// Nombres de la taxonomía de los géneros ya elegidos (openspec: show-genres).
const genreLabels = { jazz: "Jazz", folk: "Folk", rock: "Rock", punk: "Punk", blues: "Blues" };

function renderEditor(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const group = (name: string) => screen.getByRole("group", { name: new RegExp(name) });
const chip = (groupName: string, label: string) => within(group(groupName)).getByRole("button", { name: label });
const addGenre = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(await screen.findByRole("button", { name: `Agregar ${name}` }));
const genreChip = (name: string) => screen.getByRole("button", { name: `Quitar ${name}` });
const save = () => screen.getByRole("button", { name: "Guardar" });

beforeEach(() => vi.clearAllMocks());

describe("OwnerMusicIdentityEditor", () => {
  it("muestra los tres grupos con su contador sobre el máximo", () => {
    renderEditor(
      <OwnerMusicIdentityEditor genreLabels={genreLabels} initial={{ selfRoles: ["dj"], genres: ["jazz", "folk"], listeningFormats: [] }} />,
    );
    expect(group("Me defino como")).toHaveTextContent("1 de 3");
    expect(group("Géneros que me mueven")).toHaveTextContent("2 de 5");
    expect(group("Cómo escucho")).toHaveTextContent("0 de 5");
  });

  it("marca lo ya elegido y deja el botón deshabilitado sin cambios", () => {
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={{ ...empty, genres: ["jazz"] }} />);
    expect(genreChip("Jazz")).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it("no deja elegir más allá del máximo hasta quitar uno", async () => {
    const user = userEvent.setup();
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={{ ...empty, genres: ["rock", "punk", "jazz", "folk", "blues"] }} />);

    const search = screen.getByRole("combobox");
    expect(search).toBeDisabled();
    // Los ya elegidos siguen habilitados para poder quitarlos.
    expect(genreChip("Rock")).toBeEnabled();

    await user.click(genreChip("Rock"));
    expect(screen.getByRole("combobox")).toBeEnabled();
    expect(group("Géneros que me mueven")).toHaveTextContent("4 de 5");
  });

  it("tope de 3 en roles", async () => {
    const user = userEvent.setup();
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={empty} />);
    for (const role of ["Oyente", "Coleccionista", "Músico"]) await user.click(chip("Me defino como", role));
    expect(chip("Me defino como", "DJ")).toBeDisabled();
  });

  it("guarda los tres campos con PUT y muestra 'Guardado'", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ selfRoles: ["collector", "dj"], genres: ["jazz"], listeningFormats: ["vinyl"] });
    const onSaved = vi.fn();
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={empty} onSaved={onSaved} />);

    await user.click(chip("Me defino como", "Coleccionista"));
    await user.click(chip("Me defino como", "DJ"));
    await addGenre(user, "jazz");
    await user.click(chip("Cómo escucho", "Vinilo"));
    await user.click(save());

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [path, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(path).toBe("/api/me/profile/music-identity");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      selfRoles: ["collector", "dj"],
      genres: ["jazz"],
      listeningFormats: ["vinyl"],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Guardado");
    expect(onSaved).toHaveBeenCalled();
    // Tras guardar ya no cuenta como "con cambios".
    expect(save()).toBeDisabled();
  });

  it("puede vaciar un campo", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(empty);
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={{ ...empty, genres: ["jazz"] }} />);

    await user.click(genreChip("Jazz"));
    await user.click(save());

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string).genres).toEqual([]);
  });

  it("ante un error conserva lo elegido, muestra la alerta y permite reintentar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR"));
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={empty} />);

    await addGenre(user, "jazz");
    await user.click(save());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(genreChip("Jazz")).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("agrega un género con el teclado (flechas y Enter) y ya no lo ofrece como resultado", async () => {
    const user = userEvent.setup();
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={empty} />);

    await screen.findByRole("button", { name: "Agregar rock" });
    const search = screen.getByRole("combobox");
    await user.click(search);
    await user.keyboard("{ArrowDown}{Enter}");

    // El segundo resultado (rock) queda elegido y sale de las opciones.
    expect(screen.getByRole("button", { name: "Quitar Rock" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Agregar rock" })).toBeNull();
    expect(group("Géneros que me mueven")).toHaveTextContent("1 de 5");
  });

  it("con el máximo, el buscador queda deshabilitado y avisa cómo seguir", () => {
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={{ ...empty, genres: ["rock", "punk", "jazz", "folk", "blues"] }} />);
    expect(screen.getByRole("combobox")).toHaveAttribute("placeholder", expect.stringContaining("máximo"));
  });

  it("informa al anfitrión cuando hay cambios sin guardar", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    renderEditor(<OwnerMusicIdentityEditor genreLabels={genreLabels} initial={empty} onDirtyChange={onDirtyChange} />);

    await user.click(chip("Cómo escucho", "CD"));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(chip("Cómo escucho", "CD"));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
