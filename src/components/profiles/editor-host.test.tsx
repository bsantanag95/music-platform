import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerIdentityEditor } from "./OwnerIdentityEditor";
import { OwnerLinksEditor } from "./OwnerLinksEditor";
import { OwnerIdentityCardEditor } from "./OwnerIdentityCardEditor";
import { OwnerShowcaseEditor } from "./OwnerShowcaseEditor";
import { OwnerAlbumFavoritesEditor } from "./OwnerAlbumFavoritesEditor";
import type { IdentityCard, Showcase } from "@/services/profiles/showcase";
import type { AlbumFavorite } from "@/services/profiles/album-favorites";

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
  return { apiFetch: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/lib/api/favorites", () => ({ getMyFavorites: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

const emptyCard: IdentityCard = { artist: null, album: null, anthem: null };
const emptyInitial = { bio: null, pronouns: null, location: null, timezone: null };

// Contrato con el anfitrión (panel lateral o pantalla de ajustes): cada editor
// avisa de los cambios sin guardar y de cada guardado. Spec profile-edit-mode,
// "Cambios sin guardar en el panel".
describe("editores — contrato con el anfitrión", () => {
  describe("OwnerIdentityEditor", () => {
    it("informa sucio al escribir y limpio tras guardar, y avisa el guardado", async () => {
      const user = userEvent.setup();
      const onDirtyChange = vi.fn();
      const onSaved = vi.fn();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(
        <OwnerIdentityEditor initial={emptyInitial} onSaved={onSaved} onDirtyChange={onDirtyChange} />,
      );
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);

      await user.type(screen.getByLabelText("Bio"), "hola");
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);

      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });

    it("volver al valor original deja de contar como cambio", async () => {
      const user = userEvent.setup();
      const onDirtyChange = vi.fn();
      renderWithIntl(<OwnerIdentityEditor initial={{ ...emptyInitial, bio: "a" }} onDirtyChange={onDirtyChange} />);

      await user.type(screen.getByLabelText("Bio"), "b");
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);
      await user.type(screen.getByLabelText("Bio"), "{Backspace}");
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });

    it("no avisa el guardado si la petición falla", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      mocks.apiFetch.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "x"));
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} onSaved={onSaved} />);

      await user.type(screen.getByLabelText("Bio"), "hola");
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
      expect(onSaved).not.toHaveBeenCalled();
    });

    it("tras guardar el botón vuelve a quedar deshabilitado hasta un cambio nuevo", async () => {
      const user = userEvent.setup();
      mocks.apiFetch.mockResolvedValue({ user: {} });
      renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);

      await user.type(screen.getByLabelText("Bio"), "hola");
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled());
    });
  });

  describe("OwnerLinksEditor", () => {
    it("una fila sin URL no cuenta como cambio; con URL sí, y guardar lo limpia", async () => {
      const user = userEvent.setup();
      const onDirtyChange = vi.fn();
      const onSaved = vi.fn();
      mocks.apiFetch.mockResolvedValue({
        links: [{ id: "l1", kind: "website", url: "https://ana.example", position: 0 }],
      });
      renderWithIntl(<OwnerLinksEditor initialLinks={[]} onSaved={onSaved} onDirtyChange={onDirtyChange} />);

      await user.click(screen.getByRole("button", { name: "Agregar enlace" }));
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);

      await user.type(screen.getByLabelText("URL"), "https://ana.example");
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);

      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });
  });

  describe("OwnerIdentityCardEditor", () => {
    it("avisa el guardado tras cada cambio aplicado al instante", async () => {
      const user = userEvent.setup();
      const onSaved = vi.fn();
      mocks.apiFetch.mockResolvedValue({ showcase: { pinned: [], anthem: null, identityCard: emptyCard } });
      renderWithIntl(
        <OwnerIdentityCardEditor
          initial={{
            ...emptyCard,
            artist: { type: "artist", id: "ar1", title: "Roger Waters", artistName: null, coverThumbUrl: null },
          }}
          onSaved={onSaved}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Quitar" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });
  });

  describe("OwnerShowcaseEditor", () => {
    const pinned = {
      id: "p1",
      note: null,
      position: 0,
      entity: { type: "artist" as const, id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null },
    };
    const showcase: Showcase = { pinned: [pinned], anthem: null, identityCard: emptyCard };

    it("editar una nota marca sucio y guardar los destacados lo limpia y avisa", async () => {
      const user = userEvent.setup();
      const onDirtyChange = vi.fn();
      const onSaved = vi.fn();
      mocks.apiFetch.mockResolvedValue({
        showcase: { ...showcase, pinned: [{ ...pinned, note: "mi puerta de entrada" }] },
      });
      renderWithIntl(<OwnerShowcaseEditor initial={showcase} onSaved={onSaved} onDirtyChange={onDirtyChange} />);
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);

      await user.type(screen.getByPlaceholderText("Nota (opcional)"), "mi puerta de entrada");
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);

      await user.click(screen.getByRole("button", { name: "Guardar destacados" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });

    it("marcar 'me define' (aplicación inmediata) avisa el guardado sin marcar sucio", async () => {
      const user = userEvent.setup();
      const onDirtyChange = vi.fn();
      const onSaved = vi.fn();
      mocks.apiFetch.mockResolvedValue({
        showcase: { ...showcase, identityCard: { ...emptyCard, artist: pinned.entity } },
      });
      renderWithIntl(<OwnerShowcaseEditor initial={showcase} onSaved={onSaved} onDirtyChange={onDirtyChange} />);

      await user.click(screen.getByRole("button", { name: "Marcar como definitorio" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(onDirtyChange).not.toHaveBeenCalledWith(true);
    });
  });

  describe("OwnerAlbumFavoritesEditor", () => {
    const album: AlbumFavorite = {
      id: "pin1",
      favoriteId: "f1",
      position: 1,
      target: { id: "rg1", title: "Norman Fucking Rockwell!", artistName: "Lana Del Rey", coverThumbUrl: null },
    };

    it("quitar un álbum marca sucio y guardar lo limpia y avisa", async () => {
      const user = userEvent.setup();
      const onDirtyChange = vi.fn();
      const onSaved = vi.fn();
      mocks.apiFetch.mockResolvedValue({});
      renderWithIntl(
        <OwnerAlbumFavoritesEditor
          initial={[album]}
          identityCard={emptyCard}
          onSaved={onSaved}
          onDirtyChange={onDirtyChange}
        />,
      );
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);

      await user.click(screen.getByRole("button", { name: "Quitar" }));
      expect(onDirtyChange).toHaveBeenLastCalledWith(true);

      await user.click(screen.getByRole("button", { name: "Guardar álbumes favoritos" }));
      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    });
  });

  it("sin callbacks los editores se montan y desmontan sin error", () => {
    const { unmount } = renderWithIntl(<OwnerIdentityEditor initial={emptyInitial} />);
    expect(() => unmount()).not.toThrow();
  });

  it("al desmontarse un editor informa limpio, para no dejar el panel sucio", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const { unmount } = renderWithIntl(
      <OwnerIdentityEditor initial={emptyInitial} onDirtyChange={onDirtyChange} />,
    );
    await user.type(screen.getByLabelText("Bio"), "x");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    unmount();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
