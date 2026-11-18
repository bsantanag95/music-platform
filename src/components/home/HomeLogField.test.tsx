import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { HomeLogField } from "./HomeLogField";

const mocks = vi.hoisted(() => ({
  searchAlbums: vi.fn(),
  searchSongs: vi.fn(),
  searchArtists: vi.fn(),
  getSearchSuggestions: vi.fn(),
  dialog: vi.fn(),
}));

vi.mock("@/lib/api/catalog", () => ({
  searchAlbums: mocks.searchAlbums,
  searchSongs: mocks.searchSongs,
  searchArtists: mocks.searchArtists,
  getSearchSuggestions: mocks.getSearchSuggestions,
}));
// El diálogo tiene sus propias pruebas: aquí solo importa con qué objetivo se abre y que al cerrarse
// devuelve el control al campo.
vi.mock("@/components/quick-actions/QuickActionsDialog", () => ({
  QuickActionsDialog: (props: { onClose: () => void; initialTarget?: { title: string }; confirmListen?: boolean }) => {
    mocks.dialog(props);
    return (
      <div role="dialog" aria-label="dialogo">
        {props.initialTarget?.title}
        <button type="button" onClick={props.onClose}>
          cerrar
        </button>
      </div>
    );
  },
}));

const albumId = "a1b2c3d4-0000-4000-8000-000000000010";
const suggestions = {
  suggestions: [
    { kind: "album", id: albumId, title: "Too Fast for Love", artistName: "Mötley Crüe", year: 1981, coverThumbUrl: null },
  ],
};

function renderField() {
  return renderWithIntl(
    <>
      <h1 id="log-heading">¿Qué escuchaste hoy?</h1>
      <HomeLogField labelledBy="log-heading" />
    </>,
  );
}

describe("HomeLogField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSearchSuggestions.mockResolvedValue(suggestions);
    mocks.searchAlbums.mockResolvedValue({ type: "album", remoteFailed: false, total: 0, nextOffset: null, refine: null, results: [] });
  });

  it("es un combobox rotulado por el titular y pide dos letras", async () => {
    renderField();
    const field = screen.getByRole("combobox", { name: "¿Qué escuchaste hoy?" });
    await userEvent.type(field, "t");
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(mocks.getSearchSuggestions).not.toHaveBeenCalled();
  });

  it("sugiere álbumes y elegir uno con clic abre el diálogo con ese objetivo", async () => {
    renderField();
    await userEvent.type(screen.getByRole("combobox"), "too fast");
    await userEvent.click(await screen.findByRole("option", { name: /Too Fast for Love/ }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Too Fast for Love");
    expect(mocks.dialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialTarget: { type: "release-group", id: albumId, title: "Too Fast for Love", subtitle: "Mötley Crüe" },
      }),
    );
    expect(mocks.dialog.mock.lastCall?.[0].confirmListen).toBeFalsy();
  });

  it("elige con el teclado y al cerrar el diálogo vacía el campo y le devuelve el foco", async () => {
    renderField();
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "too fast");
    await screen.findByRole("option", { name: /Too Fast for Love/ });
    await userEvent.keyboard("{ArrowDown}");
    expect(field).toHaveAttribute("aria-activedescendant");
    await userEvent.keyboard("{Enter}");
    await userEvent.click(await screen.findByRole("button", { name: "cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
  });

  it("Enter sin opción activa no abre nada", async () => {
    renderField();
    await userEvent.type(screen.getByRole("combobox"), "too fast");
    await screen.findByRole("option", { name: /Too Fast for Love/ });
    await userEvent.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Escape cierra la lista", async () => {
    renderField();
    const field = screen.getByRole("combobox");
    await userEvent.type(field, "too fast");
    await screen.findByRole("option", { name: /Too Fast for Love/ });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(field).toHaveAttribute("aria-expanded", "false");
  });

  it("en Canción busca canciones", async () => {
    mocks.getSearchSuggestions.mockResolvedValue({
      suggestions: [{ kind: "song", id: "rec-1", title: "Live Wire", artistName: "Mötley Crüe", coverThumbUrl: null }],
    });
    mocks.searchSongs.mockResolvedValue({
      type: "song", remoteFailed: false, total: 0, nextOffset: null, interpretation: null, alternatives: [], refine: null, results: [],
    });
    renderField();
    await userEvent.click(screen.getByRole("radio", { name: /Canci/ }));
    await userEvent.type(screen.getByRole("combobox"), "live wire");
    expect(await screen.findByRole("option", { name: /Live Wire/ })).toBeInTheDocument();
  });
});
