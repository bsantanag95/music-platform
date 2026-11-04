// @vitest-environment node
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_COVER_SIDE, clearEmbeddedImageCache, fetchImageBytes, loadEmbeddedCover, loadEmbeddedImage } from "./images";

async function webp(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).webp().toBuffer();
}

async function decode(dataUri: string) {
  const base64 = dataUri.replace(/^data:image\/png;base64,/, "");
  return sharp(Buffer.from(base64, "base64")).metadata();
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  clearEmbeddedImageCache();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("imágenes dentro de las imágenes de compartir", () => {
  it("convierte una carátula WebP del espejo a PNG", async () => {
    vi.stubEnv("STORAGE_PUBLIC_DOMAIN", "covers.example.com");
    fetchMock.mockResolvedValue(new Response(new Uint8Array(await webp(250, 250))));
    const png = await loadEmbeddedCover("https://covers.example.com/covers/abc/123.webp");
    expect(png).toMatch(/^data:image\/png;base64,/);
    const meta = await decode(png!);
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(250);
  });

  it("nunca amplía: una carátula de 120 px queda en 120 px", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(await webp(120, 120))));
    const meta = await decode((await loadEmbeddedCover("https://coverartarchive.org/release-group/x/front-250"))!);
    expect(meta.width).toBe(120);
  });

  it("achica a ≤250 px una fuente más grande", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(await webp(500, 400))));
    const meta = await decode((await loadEmbeddedCover("https://coverartarchive.org/release-group/x/front-250"))!);
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(MAX_COVER_SIDE);
  });

  it("una foto de Commons respeta su propio tamaño de dibujo", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(await webp(500, 500))));
    const meta = await decode(
      (await loadEmbeddedImage("https://upload.wikimedia.org/wikipedia/commons/thumb/a/b/c.jpg/500px-c.jpg", 320))!,
    );
    expect(meta.width).toBe(320);
  });

  it.each([
    ["un host desconocido", "https://evil.example.com/cover.png"],
    ["http sin TLS", "http://coverartarchive.org/release-group/x/front-250"],
    ["un archivo local de Wikipedia (posible uso justo)", "https://upload.wikimedia.org/wikipedia/en/a/ab/cover.jpg"],
    ["una ruta local fuera de uploads", "/uploads/../../.env"],
  ])("no pide %s", async (_label, src) => {
    expect(await fetchImageBytes(src)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reutiliza una carátula ya convertida", async () => {
    const url = "https://coverartarchive.org/release-group/y/front-250";
    fetchMock.mockResolvedValueOnce(new Response(new Uint8Array(await webp(250, 250))));
    const first = await loadEmbeddedCover(url);
    expect(first).not.toBeNull();
    expect(await loadEmbeddedCover(url)).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recuerda un fallo 5 minutos y después reintenta", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const url = "https://coverartarchive.org/release-group/z/front-250";
      fetchMock.mockResolvedValueOnce(new Response("no", { status: 503 }));
      expect(await loadEmbeddedCover(url)).toBeNull();
      expect(await loadEmbeddedCover(url)).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1);
      fetchMock.mockResolvedValueOnce(new Response(new Uint8Array(await webp(250, 250))));
      expect(await loadEmbeddedCover(url)).not.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("sin URL (sin carátula o retirada) no pide nada", async () => {
    expect(await loadEmbeddedCover(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["un 404", () => Promise.resolve(new Response("no", { status: 404 }))],
    ["un error de red", () => Promise.reject(new Error("ECONNRESET"))],
    ["bytes que no son imagen", () => Promise.resolve(new Response("hola"))],
  ])("ante %s devuelve null para el recuadro tipográfico", async (_label, impl) => {
    fetchMock.mockImplementation(impl);
    expect(await loadEmbeddedCover("https://coverartarchive.org/release-group/x/front-250")).toBeNull();
  });
});
