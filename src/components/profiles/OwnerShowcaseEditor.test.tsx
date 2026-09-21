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
  identityCard: { artist: null, album: null, anthem: null },
  ...over,
});

const radiohead = { type: "artist" as const, id: "ar1", title: "Radiohead", artistName: null, coverThumbUrl: null };
const idioteque = {
  type: "recording" as const,
  id: "rec1",
  title: "Idioteque",
  artistName: "Radiohead",
  coverThumbUrl: null,
};
const withPins = (pinned: Showcase["pinned"]) => showcase({ pinned });

describe("OwnerShowcaseEditor — Empieza por aquí", () => {
  it("no ofrece el himno ni el marcador 'me define' (viven solo en el editor de la Tarjeta)", () => {
    renderWithIntl(
      <OwnerShowcaseEditor
        initial={withPins([
          { id: "p1", note: null, position: 0, entity: radiohead },
          { id: "p2", note: null, position: 1, entity: idioteque },
        ])}
      />,
    );
    expect(screen.queryByRole("button", { name: /definitorio|Tarjeta de Identidad/ })).not.toBeInTheDocument();
    expect(screen.queryByText("★")).not.toBeInTheDocument();
    expect(screen.queryByText(/himno/i)).not.toBeInTheDocument();
  });

  it("cada ítem muestra un campo de nota con etiqueta y contador", () => {
    renderWithIntl(
      <OwnerShowcaseEditor
        initial={withPins([{ id: "p1", note: "mi puerta de entrada al jazz", position: 0, entity: radiohead }])}
      />,
    );
    const note = screen.getByLabelText(/¿Por qué empezar por aquí\?/);
    expect(note).toHaveValue("mi puerta de entrada al jazz");
    expect(note).toHaveAttribute("maxlength", "120");
    expect(screen.getByText("28/120")).toBeInTheDocument();
  });

  it("escribir la nota actualiza el contador y aplana los saltos de línea", async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <OwnerShowcaseEditor initial={withPins([{ id: "p1", note: null, position: 0, entity: radiohead }])} />,
    );
    const note = screen.getByLabelText(/¿Por qué empezar por aquí\?/);
    expect(screen.getByText("0/120")).toBeInTheDocument();

    await user.type(note, "hola{enter}mundo");

    expect(note).toHaveValue("hola mundo");
    expect(screen.getByText("10/120")).toBeInTheDocument();
  });

  it("guarda el orden y la nota de cada ítem con un único PUT a /api/me/profile/pinned", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({
      showcase: withPins([{ id: "p1", note: "nota", position: 0, entity: radiohead }]),
    });
    renderWithIntl(
      <OwnerShowcaseEditor initial={withPins([{ id: "p1", note: null, position: 0, entity: radiohead }])} />,
    );

    await user.type(screen.getByLabelText(/¿Por qué empezar por aquí\?/), "nota");
    await user.click(screen.getByRole("button", { name: "Guardar recomendaciones" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile/pinned");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      items: [{ type: "artist", id: "ar1", note: "nota" }],
    });
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
  });

  it("un ítem sin nota se guarda con nota null (la nota es opcional)", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue({
      showcase: withPins([{ id: "p1", note: null, position: 0, entity: radiohead }]),
    });
    renderWithIntl(
      <OwnerShowcaseEditor initial={withPins([{ id: "p1", note: "vieja", position: 0, entity: radiohead }])} />,
    );

    await user.clear(screen.getByLabelText(/¿Por qué empezar por aquí\?/));
    await user.click(screen.getByRole("button", { name: "Guardar recomendaciones" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    const [, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      items: [{ type: "artist", id: "ar1", note: null }],
    });
  });

  it("agrega un favorito como ítem nuevo con la nota vacía", async () => {
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

    await user.click(screen.getByText("Agregar de favoritos"));
    await user.click(await screen.findByText("boygenius"));

    expect(screen.getByLabelText(/¿Por qué empezar por aquí\?/)).toHaveValue("");
    expect(screen.getByText("0/120")).toBeInTheDocument();
    // Nunca llama a los endpoints de identidad.
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("con 4 ítems oculta el selector y avisa del máximo", () => {
    const four = ["a", "b", "c", "d"].map((id, position) => ({
      id: `p${id}`,
      note: null,
      position,
      entity: { ...radiohead, id: `ar-${id}`, title: `Artista ${id}` },
    }));
    renderWithIntl(<OwnerShowcaseEditor initial={withPins(four)} />);

    expect(screen.queryByText("Agregar de favoritos")).not.toBeInTheDocument();
    expect(screen.getByText("Máximo 4 recomendaciones")).toBeInTheDocument();
  });
});
