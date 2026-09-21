import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
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

const empty = { selfRoles: [], genres: [], listeningFormats: [] };

const group = (name: string) => screen.getByRole("group", { name: new RegExp(name) });
const chip = (groupName: string, label: string) => within(group(groupName)).getByRole("button", { name: label });
const save = () => screen.getByRole("button", { name: "Guardar" });

beforeEach(() => vi.clearAllMocks());

describe("OwnerMusicIdentityEditor", () => {
  it("muestra los tres grupos con su contador sobre el máximo", () => {
    renderWithIntl(
      <OwnerMusicIdentityEditor initial={{ selfRoles: ["dj"], genres: ["jazz", "folk"], listeningFormats: [] }} />,
    );
    expect(group("Me defino como")).toHaveTextContent("1 de 3");
    expect(group("Géneros que me mueven")).toHaveTextContent("2 de 5");
    expect(group("Cómo escucho")).toHaveTextContent("0 de 5");
  });

  it("marca lo ya elegido y deja el botón deshabilitado sin cambios", () => {
    renderWithIntl(<OwnerMusicIdentityEditor initial={{ ...empty, genres: ["jazz"] }} />);
    expect(chip("Géneros que me mueven", "Jazz")).toHaveAttribute("aria-pressed", "true");
    expect(chip("Géneros que me mueven", "Rock")).toHaveAttribute("aria-pressed", "false");
    expect(save()).toBeDisabled();
  });

  it("no deja elegir más allá del máximo hasta quitar uno", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerMusicIdentityEditor initial={{ ...empty, genres: ["rock", "punk", "jazz", "folk", "blues"] }} />);

    expect(chip("Géneros que me mueven", "Pop")).toBeDisabled();
    // Los ya elegidos siguen habilitados para poder quitarlos.
    expect(chip("Géneros que me mueven", "Rock")).toBeEnabled();

    await user.click(chip("Géneros que me mueven", "Rock"));
    expect(chip("Géneros que me mueven", "Pop")).toBeEnabled();
    expect(group("Géneros que me mueven")).toHaveTextContent("4 de 5");
  });

  it("tope de 3 en roles", async () => {
    const user = userEvent.setup();
    renderWithIntl(<OwnerMusicIdentityEditor initial={empty} />);
    for (const role of ["Oyente", "Coleccionista", "Músico"]) await user.click(chip("Me defino como", role));
    expect(chip("Me defino como", "DJ")).toBeDisabled();
  });

  it("guarda los tres campos con PUT y muestra 'Guardado'", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({ selfRoles: ["collector", "dj"], genres: ["jazz"], listeningFormats: ["vinyl"] });
    const onSaved = vi.fn();
    renderWithIntl(<OwnerMusicIdentityEditor initial={empty} onSaved={onSaved} />);

    await user.click(chip("Me defino como", "Coleccionista"));
    await user.click(chip("Me defino como", "DJ"));
    await user.click(chip("Géneros que me mueven", "Jazz"));
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
    renderWithIntl(<OwnerMusicIdentityEditor initial={{ ...empty, genres: ["jazz"] }} />);

    await user.click(chip("Géneros que me mueven", "Jazz"));
    await user.click(save());

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(JSON.parse((mocks.apiFetch.mock.calls[0]![2] as RequestInit).body as string).genres).toEqual([]);
  });

  it("ante un error conserva lo elegido, muestra la alerta y permite reintentar", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR"));
    renderWithIntl(<OwnerMusicIdentityEditor initial={empty} />);

    await user.click(chip("Géneros que me mueven", "Jazz"));
    await user.click(save());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(chip("Géneros que me mueven", "Jazz")).toHaveAttribute("aria-pressed", "true");
    expect(save()).toBeEnabled();
  });

  it("informa al anfitrión cuando hay cambios sin guardar", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    renderWithIntl(<OwnerMusicIdentityEditor initial={empty} onDirtyChange={onDirtyChange} />);

    await user.click(chip("Cómo escucho", "CD"));
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(chip("Cómo escucho", "CD"));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
