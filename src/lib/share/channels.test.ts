import { describe, expect, it } from "vitest";
import { SHARE_INTENT_CHANNELS, downloadUrl, intentUrl, withVia } from "./channels";

const link = "https://ejemplo.app/es/album/metallica-master-of-puppets-abc?via=x";

describe("canales de la hoja de compartir", () => {
  it("agrega el canal a la URL canónica y reemplaza uno previo", () => {
    expect(withVia("https://ejemplo.app/es/album/a", "whatsapp")).toBe("https://ejemplo.app/es/album/a?via=whatsapp");
    expect(withVia("https://ejemplo.app/es/album/a?via=x", "copy")).toBe("https://ejemplo.app/es/album/a?via=copy");
  });

  it.each([
    ["x", "https://x.com/intent/post?"],
    ["whatsapp", "https://wa.me/?text="],
    ["threads", "https://www.threads.net/intent/post?"],
    ["bluesky", "https://bsky.app/intent/compose?"],
    ["facebook", "https://www.facebook.com/sharer/sharer.php?u="],
    ["telegram", "https://t.me/share/url?"],
    ["reddit", "https://www.reddit.com/submit?"],
  ] as const)("%s usa su URL de publicación con el enlace codificado", (channel, prefix) => {
    const url = intentUrl(channel, "Master of Puppets · Metallica", link);
    expect(url.startsWith(prefix)).toBe(true);
    expect(url).toContain(encodeURIComponent(link));
  });

  it("todos los atajos son enlaces https planos", () => {
    for (const channel of SHARE_INTENT_CHANNELS) expect(intentUrl(channel, "t", link)).toMatch(/^https:\/\//);
  });

  it("la descarga es la misma imagen versionada como adjunto", () => {
    expect(downloadUrl("/api/share/image/album/rg1?locale=es&format=link&v=abc")).toBe(
      "/api/share/image/album/rg1?locale=es&format=link&v=abc&download=1",
    );
    expect(downloadUrl("https://ejemplo.app/api/share/image/album/rg1?v=abc")).toBe(
      "https://ejemplo.app/api/share/image/album/rg1?v=abc&download=1",
    );
  });
});
