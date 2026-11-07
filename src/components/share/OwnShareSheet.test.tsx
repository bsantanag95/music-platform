import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ get: vi.fn(), make: vi.fn(), stop: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api/share", () => ({ getOwnShare: mocks.get, makeOwnShareable: mocks.make, stopOwnShare: mocks.stop, postShareEvent: mocks.post }));

import { OwnShareButton, OwnShareSheet } from "./OwnShareSheet";

const payload = {
  kind: "rating" as const,
  ref: "r1",
  url: "https://ejemplo.app/es/users/ana/album/x",
  title: "@ana: 86/100 a Disco",
  images: [{ format: "link" as const, url: "/api/share/image/rating/r1?locale=es&format=link&personal=1" }],
  imageAlt: "Disco",
  downloadName: "disco-ana",
};
const state = (over = {}) => ({ state: "needs_gesture", canUnshare: false, hasNote: false, payload, ...over });
const open = () => userEvent.click(screen.getByRole("button", { name: "Compartir" }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(state());
});

describe("hoja de lo propio", () => {
  it("no pide nada hasta abrirse", () => {
    renderWithIntl(<OwnShareButton kind="rating" refId="r1" />);
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("sin el gesto ofrece hacerla pública y descargar, sin copiar enlace ni atajos", async () => {
    renderWithIntl(<OwnShareButton kind="rating" refId="r1" />);
    await open();
    expect(await screen.findByRole("button", { name: "Hacer pública y compartir" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Descargar imagen" }).getAttribute("href")).toContain("personal=1");
    expect(screen.queryByRole("button", { name: "Copiar enlace" })).toBeNull();
    expect(screen.queryByRole("link", { name: /Compartir en/ })).toBeNull();
    expect(mocks.make).not.toHaveBeenCalled();
  });

  it("tras el gesto pasa a las acciones normales sin cerrarse", async () => {
    const changed = vi.fn();
    mocks.make.mockResolvedValue(state({ state: "public", canUnshare: true, payload: { ...payload, images: [{ format: "link" as const, url: "/api/share/image/rating/r1?v=abc" }] } }));
    renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="rating" refId="r1" onChanged={changed} />);
    await userEvent.click(await screen.findByRole("button", { name: "Hacer pública y compartir" }));
    expect(await screen.findByRole("button", { name: "Copiar enlace" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dejar de compartir" })).toBeTruthy();
    expect(changed).toHaveBeenCalled();
  });

  it("una discografía avisa qué se abre y quita su propia marca", async () => {
    mocks.get.mockResolvedValue(state());
    const first = renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="discography" refId="u.a" />);
    expect(await screen.findByText(/también las que pongas después, y tu avance/)).toBeTruthy();
    first.unmount();

    mocks.get.mockResolvedValue(state({ state: "public", canUnshare: true }));
    mocks.stop.mockResolvedValue(state());
    renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="discography" refId="u.a" />);
    await userEvent.click(await screen.findByRole("button", { name: "Dejar de compartir" }));
    expect(mocks.stop).toHaveBeenCalledWith("discography", "u.a", "es");
  });

  it("dejar de compartir vuelve al aviso", async () => {
    mocks.get.mockResolvedValue(state({ state: "public", canUnshare: true }));
    mocks.stop.mockResolvedValue(state());
    renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="rating" refId="r1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Dejar de compartir" }));
    expect(await screen.findByRole("button", { name: "Hacer pública y compartir" })).toBeTruthy();
    expect(mocks.stop).toHaveBeenCalledWith("rating", "r1", "es");
  });

  it("con el perfil privado solo ofrece descargar", async () => {
    mocks.get.mockResolvedValue(state({ state: "private_profile" }));
    renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="rating" refId="r1" />);
    expect(await screen.findByRole("link", { name: "Descargar imagen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hacer pública y compartir" })).toBeNull();
    expect(screen.getByText(/Tu perfil es privado/)).toBeTruthy();
  });

  it("avisa que la impresión de una escucha también se verá", async () => {
    mocks.get.mockResolvedValue(state({ hasNote: true }));
    renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="listen" refId="l1" />);
    expect(await screen.findByText(/tu impresión también se verá/)).toBeTruthy();
  });

  it("un fallo se muestra sin perder la hoja", async () => {
    mocks.make.mockRejectedValue(new Error("no"));
    renderWithIntl(<OwnShareSheet open onClose={vi.fn()} kind="rating" refId="r1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Hacer pública y compartir" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByRole("button", { name: "Hacer pública y compartir" })).toBeTruthy();
  });
});
