import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api/share", () => ({ postShareEvent: mocks.post }));

import { ShareButton } from "./ShareButton";
import type { SharePayload } from "./ShareSheet";

const payload: SharePayload = {
  kind: "album",
  ref: "rg1",
  url: "https://ejemplo.app/es/album/metallica-master-of-puppets-abc",
  title: "Master of Puppets · Metallica",
  storyImageUrl: "/api/share/image/album/rg1?locale=es&format=story&v=abc",
  imageUrl: "/api/share/image/album/rg1?locale=es&format=link&v=abc",
  imageAlt: "Master of Puppets · Metallica · 1986",
  downloadName: "metallica-master-of-puppets",
};

function stubNavigator(overrides: Partial<Navigator>) {
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

async function openSheet() {
  const user = userEvent.setup();
  renderWithIntl(<ShareButton payload={payload} />);
  await user.click(screen.getByRole("button", { name: "Compartir" }));
  return user;
}

beforeEach(() => {
  mocks.post.mockReset();
  stubNavigator({ share: undefined as unknown as Navigator["share"] });
});

afterEach(() => {
  stubNavigator({ share: undefined as unknown as Navigator["share"] });
});

describe("hoja de compartir", () => {
  it("es un diálogo con vista previa y las acciones en orden, sin menú nativo si el navegador no lo ofrece", async () => {
    await openSheet();
    const dialog = screen.getByRole("dialog", { name: "Compartir" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `Vista previa: ${payload.imageAlt}` })).toHaveAttribute("src", payload.imageUrl);
    expect(screen.queryByRole("button", { name: "Compartir…" })).not.toBeInTheDocument();
    const labels = screen.getAllByRole("link").map((a) => a.textContent);
    expect(labels).toEqual(["X", "WhatsApp", "Threads", "Bluesky", "Facebook", "Telegram", "Reddit", "Descargar imagen"]);
  });

  it("los atajos abren la red con la URL canónica y su canal, y registran el evento", async () => {
    const user = await openSheet();
    const whatsapp = screen.getByRole("link", { name: "Compartir en WhatsApp" });
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(whatsapp.getAttribute("href")).toContain(encodeURIComponent(`${payload.url}?via=whatsapp`));
    whatsapp.addEventListener("click", (event) => event.preventDefault());
    await user.click(whatsapp);
    expect(mocks.post).toHaveBeenCalledWith({ kind: "album", ref: "rg1", channel: "whatsapp", format: "link" });
  });

  it("copia el enlace con ?via=copy y lo confirma", async () => {
    const user = await openSheet();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    expect(writeText).toHaveBeenCalledWith(`${payload.url}?via=copy`);
    expect(await screen.findByText("Enlace copiado")).toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({ channel: "copy" }));
  });

  it("si el portapapeles falla, muestra el enlace en un campo para copiarlo a mano", async () => {
    const user = await openSheet();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("bloqueado"));
    await user.click(screen.getByRole("button", { name: "Copiar enlace" }));
    const field = await screen.findByLabelText("Copia el enlace:");
    expect(field).toHaveValue(`${payload.url}?via=copy`);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("con menú nativo: lo ofrece primero y no registra nada si se cancela", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelado", "AbortError"));
    stubNavigator({ share });
    const user = await openSheet();
    const native = await screen.findByRole("button", { name: "Compartir…" });
    await user.click(native);
    expect(share).toHaveBeenCalledWith({ title: payload.title, url: `${payload.url}?via=native` });
    expect(mocks.post).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("la descarga es la imagen versionada como adjunto con nombre legible", async () => {
    await openSheet();
    const download = screen.getByRole("link", { name: "Descargar imagen" });
    expect(download).toHaveAttribute("href", `${payload.imageUrl}&download=1`);
    expect(download).toHaveAttribute("download", "metallica-master-of-puppets.png");
  });

  it("Escape cierra la hoja y devuelve el foco al botón", async () => {
    const user = await openSheet();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Compartir" })).toHaveFocus();
  });

  describe("formato Historia", () => {
    const story = () => userEvent.click(screen.getByRole("button", { name: "Historia" }));

    it("cambia la vista previa y la descarga, y mantiene el enlace en los atajos", async () => {
      renderWithIntl(<ShareButton payload={payload} />);
      await userEvent.click(screen.getByRole("button", { name: "Compartir" }));
      await story();
      expect(screen.getByRole("img").getAttribute("src")).toContain("format=story");
      const download = screen.getByRole("link", { name: "Descargar imagen" });
      expect(download.getAttribute("href")).toContain("format=story");
      expect(download.getAttribute("download")).toMatch(/-story\.png$/);
      expect(screen.getByRole("link", { name: "Compartir en X" }).getAttribute("href")).toContain("intent");
    });

    it("registra el formato elegido", async () => {
      renderWithIntl(<ShareButton payload={payload} />);
      await userEvent.click(screen.getByRole("button", { name: "Compartir" }));
      await story();
      await userEvent.click(screen.getByRole("link", { name: "Descargar imagen" }));
      expect(mocks.post).toHaveBeenCalledWith(expect.objectContaining({ channel: "download", format: "story" }));
    });

    it("manda el archivo al menú nativo si el navegador puede", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["png"], { type: "image/png" }) }));
      Object.defineProperty(navigator, "share", { configurable: true, value: share });
      Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
      renderWithIntl(<ShareButton payload={payload} />);
      await userEvent.click(screen.getByRole("button", { name: "Compartir" }));
      await story();
      await waitFor(() => expect(fetch).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));
      await userEvent.click(screen.getByRole("button", { name: "Compartir…" }));
      expect(share.mock.calls[0]?.[0].files?.[0]?.name).toMatch(/-story\.png$/);
      Reflect.deleteProperty(navigator, "share");
      Reflect.deleteProperty(navigator, "canShare");
      vi.unstubAllGlobals();
    });

    it("sin archivos comparte el enlace", async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));
      Object.defineProperty(navigator, "share", { configurable: true, value: share });
      renderWithIntl(<ShareButton payload={payload} />);
      await userEvent.click(screen.getByRole("button", { name: "Compartir" }));
      await story();
      await userEvent.click(screen.getByRole("button", { name: "Compartir…" }));
      expect(share.mock.calls[0]?.[0].url).toContain("via=native");
      Reflect.deleteProperty(navigator, "share");
      vi.unstubAllGlobals();
    });
  });
});
