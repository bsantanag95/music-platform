import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CollectionAlbumAction } from "./CollectionAlbumAction";

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
  return {
    addCollectionEntry: vi.fn(),
    removeCollectionEntry: vi.fn(),
    addWantedEntries: vi.fn(),
    removeWantedEntry: vi.fn(),
    ApiError,
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/api/collection", () => ({
  addCollectionEntry: mocks.addCollectionEntry,
  removeCollectionEntry: mocks.removeCollectionEntry,
}));
vi.mock("@/lib/api/wanted", () => ({
  addWantedEntries: mocks.addWantedEntries,
  removeWantedEntry: mocks.removeWantedEntry,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const releaseGroupId = "00000000-0000-4000-8000-0000000000a1";
const entry = {
  id: "00000000-0000-4000-8000-0000000000e1",
  format: "vinyl" as const,
  attributes: ["limited-edition" as const],
  note: "portada alternativa",
  audience: "followers" as const,
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  album: {
    id: releaseGroupId,
    title: "DSOTM",
    coverThumbUrl: null,
    artistId: null,
    artistName: null,
  },
};
const wantedEntry = {
  id: "00000000-0000-4000-8000-0000000000w1",
  format: null,
  attributes: [],
  note: null,
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  album: entry.album,
};

function renderAction(props: Partial<React.ComponentProps<typeof CollectionAlbumAction>> = {}) {
  return renderWithIntl(
    <CollectionAlbumAction
      releaseGroupId={releaseGroupId}
      authenticated
      initialEntries={[]}
      initialWantedEntries={[]}
      {...props}
    />,
  );
}

describe("CollectionAlbumAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ofrece iniciar sesión a visitantes anónimos", () => {
    renderAction({ authenticated: false });
    expect(screen.getByRole("link", { name: "Iniciar sesión para coleccionar" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });

  it("al abrir muestra el selector 'La tengo' / 'La busco' antes de cualquier formulario", async () => {
    const user = userEvent.setup();
    renderAction();

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    expect(screen.getByRole("radio", { name: "La tengo" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "La busco" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Formato")).not.toBeInTheDocument();
  });

  it("agrega una copia con el formato elegido tras elegir 'La tengo'", async () => {
    const user = userEvent.setup();
    mocks.addCollectionEntry.mockResolvedValue({ ...entry, format: "cd", attributes: [], note: null });
    renderAction();

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    await user.click(screen.getByRole("radio", { name: "La tengo" }));
    await user.selectOptions(screen.getByLabelText("Formato"), "cd");
    await user.click(screen.getByRole("button", { name: "Agregar copia" }));

    await waitFor(() =>
      expect(mocks.addCollectionEntry).toHaveBeenCalledWith(
        expect.objectContaining({ releaseGroupId, format: "cd", attributes: [], note: null }),
      ),
    );
    expect(await screen.findByText("CD", { selector: "span" })).toBeInTheDocument();
  });

  it("agrega una copia con atributos y nota", async () => {
    const user = userEvent.setup();
    mocks.addCollectionEntry.mockResolvedValue(entry);
    renderAction();

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    await user.click(screen.getByRole("radio", { name: "La tengo" }));
    await user.click(screen.getByText("Edición limitada"));
    await user.type(screen.getByLabelText("Nota"), "portada alternativa");
    await user.click(screen.getByRole("button", { name: "Agregar copia" }));

    await waitFor(() =>
      expect(mocks.addCollectionEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: ["limited-edition"],
          note: "portada alternativa",
        }),
      ),
    );
  });

  it("quita una copia existente", async () => {
    const user = userEvent.setup();
    mocks.removeCollectionEntry.mockResolvedValue(null);
    renderAction({ initialEntries: [entry] });

    await user.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(mocks.removeCollectionEntry).toHaveBeenCalledWith(entry.id));
    expect(screen.queryByText("portada alternativa")).not.toBeInTheDocument();
  });

  it("muestra el error localizado cuando el alta falla", async () => {
    const user = userEvent.setup();
    mocks.addCollectionEntry.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "x"));
    renderAction();

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    await user.click(screen.getByRole("radio", { name: "La tengo" }));
    await user.click(screen.getByRole("button", { name: "Agregar copia" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el cambio. Intentá de nuevo.",
    );
  });

  it("agrega una sola variante deseada tras elegir 'La busco'", async () => {
    const user = userEvent.setup();
    mocks.addWantedEntries.mockResolvedValue([wantedEntry]);
    renderAction();

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    await user.click(screen.getByRole("radio", { name: "La busco" }));
    await user.click(screen.getByRole("button", { name: "Agregar a tu búsqueda" }));

    await waitFor(() =>
      expect(mocks.addWantedEntries).toHaveBeenCalledWith({
        releaseGroupId,
        entries: [{ format: null, attributes: [], note: null }],
      }),
    );
  });

  it("agrega varias variantes deseadas en un solo envío", async () => {
    const user = userEvent.setup();
    mocks.addWantedEntries.mockResolvedValue([wantedEntry, { ...wantedEntry, id: "w2" }]);
    renderAction();

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    await user.click(screen.getByRole("radio", { name: "La busco" }));
    await user.click(screen.getByRole("button", { name: "Agregar otra variante" }));

    const vinylOptions = screen.getAllByRole("radio", { name: "Vinilo" });
    await user.click(vinylOptions[0]!);

    await user.click(screen.getByRole("button", { name: "Agregar a tu búsqueda" }));

    await waitFor(() =>
      expect(mocks.addWantedEntries).toHaveBeenCalledWith({
        releaseGroupId,
        entries: [
          { format: "vinyl", attributes: [], note: null },
          { format: null, attributes: [], note: null },
        ],
      }),
    );
  });

  it("quita una entrada de deseo existente", async () => {
    const user = userEvent.setup();
    mocks.removeWantedEntry.mockResolvedValue(null);
    renderAction({ initialWantedEntries: [wantedEntry] });

    await user.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(mocks.removeWantedEntry).toHaveBeenCalledWith(wantedEntry.id));
  });

  it("no bloquea agregar a la wishlist un álbum que ya está en la colección", async () => {
    const user = userEvent.setup();
    mocks.addWantedEntries.mockResolvedValue([wantedEntry]);
    renderAction({ initialEntries: [entry] });

    await user.click(screen.getByRole("button", { name: "Agregar a la colección" }));
    await user.click(screen.getByRole("radio", { name: "La busco" }));
    await user.click(screen.getByRole("button", { name: "Agregar a tu búsqueda" }));

    await waitFor(() => expect(mocks.addWantedEntries).toHaveBeenCalled());
  });
});
