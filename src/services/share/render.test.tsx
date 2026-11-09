// @vitest-environment node
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShareTarget } from "./types";

const images = vi.hoisted(() => ({ cover: vi.fn(), image: vi.fn() }));
vi.mock("./images", async (original) => ({
  ...(await original<typeof import("./images")>()),
  loadEmbeddedCover: images.cover,
  loadEmbeddedImage: images.image,
}));

import { renderShareImage } from "./render";

async function coverDataUri(color: { r: number; g: number; b: number }): Promise<string> {
  const png = await sharp({ create: { width: 250, height: 250, channels: 3, background: color } }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

function target(overrides: Partial<ShareTarget["card"]> = {}): ShareTarget {
  return {
    kind: "album",
    ref: "rg1",
    locale: "es",
    canonicalPath: "/es/album/metallica-master-of-puppets-abc",
    title: "Master of Puppets",
    description: "Metallica · Álbum de estudio · 1986",
    imageAlt: "Master of Puppets, de Metallica",
    downloadName: "metallica-master-of-puppets",
    card: {
      kicker: "Álbum",
      title: "Master of Puppets",
      subtitle: "Metallica",
      meta: ["Álbum de estudio", "1986"],
      media: { type: "cover", cover: { url: "https://coverartarchive.org/x", fallbackTitle: "Master of Puppets", fallbackSubtitle: "Metallica" } },
      community: { averageStars: 4.6, count: 128 },
      credits: ["Carátulas: Cover Art Archive", "Datos: MusicBrainz"],
      ...overrides,
    },
  };
}

async function size(response: Response) {
  const bytes = Buffer.from(await response.arrayBuffer());
  // Muestra opcional para la revisión visual (tarea 3.5): SHARE_RENDER_SAMPLES=<carpeta>.
  return { bytes, meta: await sharp(bytes).metadata() };
}

const samples = process.env.SHARE_RENDER_SAMPLES;

async function keep(name: string, bytes: Buffer) {
  if (samples) await writeFile(join(samples, `${name}.png`), bytes);
}

beforeEach(async () => {
  images.cover.mockResolvedValue(await coverDataUri({ r: 180, g: 40, b: 30 }));
  images.image.mockResolvedValue(null);
});

describe("renderShareImage", () => {
  it("genera un PNG de 1200×630 para un álbum", async () => {
    const { bytes, meta } = await size(await renderShareImage(target(), "es"));
    expect(meta.format).toBe("png");
    expect([meta.width, meta.height]).toEqual([1200, 630]);
    await keep("album", bytes);
  });

  it("dibuja el recuadro tipográfico si la carátula no se pudo obtener", async () => {
    images.cover.mockResolvedValue(null);
    const { bytes, meta } = await size(await renderShareImage(target({ community: null }), "es"));
    expect(meta.width).toBe(1200);
    await keep("album-sin-caratula", bytes);
  });

  it("genera el mosaico de un género", async () => {
    const cover = { url: "https://coverartarchive.org/x", fallbackTitle: "Disco", fallbackSubtitle: "Artista" };
    const { bytes, meta } = await size(
      await renderShareImage(
        target({ kicker: "Género", title: "Thrash metal", subtitle: null, meta: [], community: null, media: { type: "mosaic", covers: [cover, cover, cover, cover] } }),
        "es",
      ),
    );
    expect(meta.height).toBe(630);
    await keep("genero", bytes);
  });

  it("genera el perfil con monograma y carátulas de su Tarjeta de Identidad", async () => {
    const cover = { url: "https://coverartarchive.org/x", fallbackTitle: "Disco", fallbackSubtitle: null };
    const { bytes } = await size(
      await renderShareImage(
        target({
          kicker: "Perfil",
          title: "Ana Pérez",
          subtitle: "@ana",
          meta: ["120 seguidores", "80 siguiendo"],
          community: null,
          media: { type: "identity", avatarUrl: null, monogram: "A", monogramVariant: 0, covers: [cover, cover, cover] },
        }),
        "es",
      ),
    );
    await keep("perfil", bytes);
  });

  it("genera la imagen genérica en el idioma pedido", async () => {
    const { bytes, meta } = await size(await renderShareImage(null, "en"));
    expect([meta.width, meta.height]).toEqual([1200, 630]);
    await keep("generica-en", bytes);
  });

  it("genera una reseña con cita, estrellas y firma", async () => {
    const quote = "Un disco que no envejece. ".repeat(8).trim();
    const { bytes, meta } = await size(
      await renderShareImage(target({ kicker: "Reseña", meta: [], community: null, quote, stars: 4.5, byline: "@ana" }), "es"),
    );
    expect([meta.width, meta.height]).toEqual([1200, 630]);
    await keep("resena", bytes);
  });

  it("genera una valoración con puntaje, en grande y sin cita", async () => {
    const { bytes } = await size(
      await renderShareImage(target({ kicker: "Valoración", meta: [], community: null, stars: 4.5, detailedScore: 86, byline: "@ana" }), "es"),
    );
    await keep("valoracion", bytes);
  });

  it("genera una valoración solo con estrellas", async () => {
    const { bytes } = await size(
      await renderShareImage(target({ kicker: "Valoración", meta: [], community: null, stars: 3.5, byline: "@ana" }), "es"),
    );
    await keep("valoracion-estrellas", bytes);
  });

  it("genera una escucha con impresión y reacción", async () => {
    const { bytes } = await size(
      await renderShareImage(
        target({ kicker: "Escucha", meta: ["noviembre de 2026", "Me encantó"], community: null, quote: "Lo escuché de corrido, dos veces.", byline: "@ana" }),
        "es",
      ),
    );
    await keep("escucha", bytes);
  });

  it("genera un comentario sin nota", async () => {
    const { bytes } = await size(
      await renderShareImage(target({ kicker: "Comentario", meta: [], community: null, quote: "Qué disco.", byline: "@ana" }), "es"),
    );
    await keep("comentario", bytes);
  });

  it("genera una lista tipográfica", async () => {
    const { bytes } = await size(
      await renderShareImage(target({ kicker: "Lista", title: "Bandas de mi vida", subtitle: "@ana", meta: ["12 artistas"], community: null, media: { type: "typographic" } }), "es"),
    );
    await keep("lista-artistas", bytes);
  });

  describe("Láminas", () => {
    const cover = { url: "https://coverartarchive.org/x", fallbackTitle: "Disco", fallbackSubtitle: "Artista" };
    const item = (i: number) => ({
      cover: i === 2 ? { ...cover, url: null } : cover,
      title: i === 1 ? "The Rise and Fall of Ziggy Stardust and the Spiders from Mars" : `Disco ${i}`,
      subtitle: "Artista",
      stars: i % 2 ? 4.5 : null,
      detailedScore: i % 2 ? 86 : null,
    });
    const top = (format: "top5" | "top10" | "grid9", count: number) => ({
      kicker: "Top",
      title: "Mis discos del año",
      subtitle: "@ana",
      meta: [],
      community: null,
      top: { format, byline: "Ana · @ana", items: Array.from({ length: count }, (_, i) => item(i)) },
    });

    it.each([
      ["top5", 5, "post", 1080, 1350],
      ["top10", 10, "post", 1080, 1350],
      ["top10", 7, "post", 1080, 1350],
      ["grid9", 9, "square", 1080, 1080],
      ["top5", 5, "story", 1080, 1920],
      ["top10", 10, "story", 1080, 1920],
      ["grid9", 9, "story", 1080, 1920],
    ] as const)("%s con %i ítems en %s", async (format, count, canvas, width, height) => {
      const { bytes, meta } = await size(await renderShareImage(target(top(format, count)), "es", { format: canvas }));
      expect([meta.width, meta.height]).toEqual([width, height]);
      await keep(`top-${format}-${count}-${canvas}`, bytes);
    });

    it("el Enlace de una Lámina usa el marco común", async () => {
      const { meta } = await size(await renderShareImage(target(top("top5", 5)), "es"));
      expect([meta.width, meta.height]).toEqual([1200, 630]);
    });

    it("una carátula que no llega degrada la caché", async () => {
      images.cover.mockResolvedValue(null);
      const options = { format: "post" as const, headers: { "Cache-Control": "immutable" }, degradedCacheControl: "public, max-age=300" };
      const response = await renderShareImage(target(top("top5", 5)), "es", options);
      expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    });
  });

  describe("tier list", () => {
    const cover = { url: "https://coverartarchive.org/x", fallbackTitle: "Disco", fallbackSubtitle: "Artista" };
    // Como el cargador real: sin URL no hay imagen, y el disco va como ficha de texto.
    beforeEach(async () => {
      const uri = await coverDataUri({ r: 180, g: 40, b: 30 });
      images.cover.mockImplementation(async (url: string | null) => (url ? uri : null));
    });
    // Como el objetivo: carátula para los primeros 10, el resto como ficha de texto.
    const tiers = (counts: number[], scores = false) => {
      let n = 0;
      return counts.map((count) =>
        Array.from({ length: count }, () => {
          n += 1;
          return {
            cover: n <= 10 ? cover : { ...cover, url: null },
            title: n === 3 ? "The Rise and Fall of Ziggy Stardust and the Spiders from Mars" : `Disco ${n}`,
            stars: scores ? 4.5 : null,
            detailedScore: scores ? 86 : null,
          };
        }),
      );
    };
    const tier = (counts: number[], labels = ["S", "A", "B", "C", "D", "E"], scores = false) => ({
      kicker: "Tier list",
      title: "Tier list de Metallica",
      subtitle: "@ana",
      meta: [],
      community: null,
      tier: { byline: "Ana · @ana", labels, tiers: tiers(counts, scores) },
    });

    it.each([
      ["pocos", [2, 3, 1, 0, 1, 0], "post", 1080, 1350],
      ["50 discos", [12, 10, 10, 8, 6, 4], "post", 1080, 1350],
      ["50 en un nivel", [50, 0, 0, 0, 0, 0], "post", 1080, 1350],
      ["Historia", [3, 4, 3, 2, 1, 1], "story", 1080, 1920],
      ["Enlace", [3, 0, 4, 3, 2, 1], "link", 1200, 630],
    ] as const)("%s en %s", async (name, counts, canvas, width, height) => {
      const { bytes, meta } = await size(await renderShareImage(target(tier([...counts])), "es", { format: canvas }));
      expect([meta.width, meta.height]).toEqual([width, height]);
      await keep(`tier-${name.replace(/ /g, "-")}-${canvas}`, bytes);
    });

    it("con etiquetas largas y notas", async () => {
      const labels = ["Obra maestra", "Muy bueno", "Bueno", "Pasable", "Flojo", "Nunca más"];
      const { bytes, meta } = await size(await renderShareImage(target(tier([2, 3, 3, 2, 1, 1], labels, true)), "es", { format: "post" }));
      expect([meta.width, meta.height]).toEqual([1080, 1350]);
      await keep("tier-etiquetas-largas-post", bytes);
    });
  });

  describe("año en discos", () => {
    const cover = (n: number, withCover: boolean) => ({ url: withCover ? "https://coverartarchive.org/x" : null, fallbackTitle: `Disco ${n}`, fallbackSubtitle: "Banda" });
    beforeEach(async () => {
      const uri = await coverDataUri({ r: 40, g: 90, b: 160 });
      images.cover.mockImplementation(async (url: string | null) => (url ? uri : null));
    });
    const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
    const year = (filled: number) => ({
      kicker: "Tu año en discos",
      title: "2026 en discos, hasta ahora",
      subtitle: "@ana",
      meta: [],
      community: null,
      year: {
        byline: "@ana",
        topLabel: "Mi Top 5",
        top: [1, 2, 3, 4, 5].map((n) => ({ cover: cover(n, true), title: n === 2 ? "The Rise and Fall of Ziggy Stardust and the Spiders from Mars" : `Disco ${n}` })),
        months: MONTHS.map((label, index) => ({
          label,
          disc: index < filled ? { cover: cover(10 + index, index < 5), title: index === 3 ? "Sabbath Bloody Sabbath (Deluxe Edition)" : `Disco ${10 + index}` } : null,
        })),
        stats: ["412 escuchas", "87 discos", "23 discos nuevos", "9 artistas descubiertos"],
      },
    });

    it.each([
      ["doce meses", 12, "post", 1080, 1350],
      ["meses vacíos", 7, "post", 1080, 1350],
      ["Historia", 12, "story", 1080, 1920],
    ] as const)("%s en %s", async (name, filled, canvas, width, height) => {
      const { bytes, meta } = await size(await renderShareImage(target(year(filled)), "es", { format: canvas }));
      expect([meta.width, meta.height]).toEqual([width, height]);
      await keep(`year-${name.replace(/ /g, "-")}-${canvas}`, bytes);
    });
  });

  describe("formato Historia", () => {
    const render = (card: Partial<ShareTarget["card"]>, name: string) =>
      renderShareImage(target(card), "es", { format: "story" })
        .then(size)
        .then(async ({ bytes, meta }) => {
          expect([meta.width, meta.height]).toEqual([1080, 1920]);
          await keep(`story-${name}`, bytes);
        });
    const cover = { url: "https://coverartarchive.org/x", fallbackTitle: "Disco", fallbackSubtitle: "Artista" };

    it("álbum con carátula sobre el vinilo", () => render({}, "album"));
    it("título largo", () => render({ title: "The Rise and Fall of Ziggy Stardust and the Spiders from Mars (Deluxe)" }, "titulo-largo"));
    it("mosaico", () => render({ kicker: "Género", title: "Thrash metal", subtitle: null, meta: [], community: null, media: { type: "mosaic", covers: [cover, cover, cover, cover] } }, "mosaico"));
    it("perfil", () => render({ kicker: "Perfil", title: "Ana Pérez", subtitle: "@ana", meta: ["120 seguidores"], community: null, media: { type: "identity", avatarUrl: null, monogram: "A", monogramVariant: 0, covers: [cover, cover, cover] } }, "perfil"));
    it("reseña larga", () => render({ kicker: "Reseña", meta: [], community: null, quote: "Un disco que no envejece. ".repeat(8).trim(), stars: 4.5, byline: "@ana" }, "resena"));
    it("valoración", () => render({ kicker: "Valoración", meta: [], community: null, stars: 4.5, detailedScore: 86, byline: "@ana" }, "valoracion"));
    it("lista tipográfica", () => render({ kicker: "Lista", title: "Bandas de mi vida", subtitle: "@ana", meta: ["12 artistas"], community: null, media: { type: "typographic" } }, "lista"));

    it("genérica", async () => {
      const { bytes, meta } = await size(await renderShareImage(null, "es", { format: "story" }));
      expect([meta.width, meta.height]).toEqual([1080, 1920]);
      await keep("story-generica", bytes);
    });
  });

  it("pasa las cabeceras de caché pedidas", async () => {
    const response = await renderShareImage(target(), "es", { headers: { "Cache-Control": "public, max-age=300" } });
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("si una carátula con URL no se pudo obtener, usa la caché de imagen degradada", async () => {
    images.cover.mockResolvedValue(null);
    const options = { headers: { "Cache-Control": "immutable" }, degradedCacheControl: "public, max-age=300" };
    expect((await renderShareImage(target(), "es", options)).headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("sin carátula en el catálogo (URL nula) la imagen no está degradada", async () => {
    const noCover = target({ media: { type: "cover", cover: { url: null, fallbackTitle: "X", fallbackSubtitle: null } } });
    const options = { headers: { "Cache-Control": "immutable" }, degradedCacheControl: "public, max-age=300" };
    expect((await renderShareImage(noCover, "es", options)).headers.get("Cache-Control")).toBe("immutable");
  });
});
