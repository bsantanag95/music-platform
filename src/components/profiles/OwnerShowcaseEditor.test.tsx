import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { OwnerShowcaseEditor } from "./OwnerShowcaseEditor";
import type { Showcase } from "@/services/profiles/showcase";

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

const getMyFavorites = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/favorites", () => ({ getMyFavorites }));

beforeEach(() => vi.clearAllMocks());

const showcase = (over: Partial<Showcase>): Showcase => ({
  pinned: [],
  anthem: null,
  identityCard: { artist: null, album: null, anthem: null },
  ...over,
});

describe("OwnerShowcaseEditor — marcador 'me define'", () => {
  it("ofrece el marcador para destacados de tipo artista o álbum, nunca canción", () => {
    renderWithIntl(
      <OwnerShowcaseEditor
        initial={showcase({
          pinned: [
            { id: "p1", note: null, position: 0, entity: { type: "artist", id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null } },
            { id: "p2", note: null, position: 1, entity: { type: "recording", id: "rec1", title: "Idioteque", artistName: "Radiohead", coverThumbUrl: null } },
          ],
        })}
      />,
    );
    // Un marcador (★/☆) por destacado elegible; la canción no ofrece ninguno.
    expect(screen.getAllByRole("button", { name: "Marcar como definitorio" })).toHaveLength(1);
  });

  it("marca un destacado como definitorio (PUT con type+id) y refleja el resultado desde identityCard", async () => {
    const user = userEvent.setup();
    const radiohead = { type: "artist" as const, id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null };
    mocks.apiFetch.mockResolvedValue({
      showcase: showcase({
        pinned: [{ id: "p1", note: null, position: 0, entity: radiohead }],
        identityCard: { artist: radiohead, album: null, anthem: null },
      }),
    });
    renderWithIntl(
      <OwnerShowcaseEditor
        initial={showcase({
          pinned: [{ id: "p1", note: null, position: 0, entity: radiohead }],
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Marcar como definitorio" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile/pinned/defining");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ type: "artist", id: "ar1" });
    expect(await screen.findByRole("button", { name: "Quitar de la Tarjeta de Identidad" })).toBeInTheDocument();
  });

  it("un destacado recién agregado (sin guardar todavía) ya ofrece el marcador — 'me define' es una referencia directa, no depende de la fila de destacado", async () => {
    const user = userEvent.setup();
    getMyFavorites.mockResolvedValue({
      favorites: [
        { id: "f1", targetType: "artist", audience: "public", createdAt: "2026-01-01T00:00:00Z", target: { id: "ar2", title: "boygenius", coverThumbUrl: null, artistName: null, artistId: null } },
      ],
      page: 1,
      pageSize: 50,
      hasNext: false,
      counts: { artist: 1, "release-group": 0, recording: 0 },
    });
    renderWithIntl(<OwnerShowcaseEditor initial={showcase({})} />);

    await user.click(screen.getAllByText("Agregar de favoritos")[0]!);
    await user.click(await screen.findByText("boygenius"));

    expect(screen.getByText("boygenius")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Marcar como definitorio" })).toBeInTheDocument();
  });
});
