// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShareTarget } from "./types";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("./targets", async (original) => ({
  ...(await original<typeof import("./targets")>()),
  loadShareTarget: mocks.load,
}));

import { shareTargetVersion } from "./targets";
import { buildShareMetadata, shareImagePath } from "./metadata";
import { clipDescription, downloadName } from "./targets/shared";

const target: ShareTarget = {
  kind: "album",
  ref: "0b6c4a9e-1d8a-4e0f-9c1e-2b3f4a5d6e7f",
  locale: "es",
  canonicalPath: "/es/album/metallica-master-of-puppets-abc",
  title: "Master of Puppets · Metallica",
  description: "Metallica · Álbum de estudio · 1986",
  imageAlt: "Master of Puppets · Metallica · 1986",
  downloadName: "metallica-master-of-puppets",
  card: {
    kicker: "Álbum",
    title: "Master of Puppets",
    subtitle: "Metallica",
    meta: [],
    media: { type: "typographic" },
    community: null,
    credits: [],
  },
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ejemplo.app");
  mocks.load.mockResolvedValue(target);
});

afterEach(() => vi.unstubAllEnvs());

describe("metadatos para compartir", () => {
  it("anuncian imagen absoluta y versionada, canónica sin query y tarjeta grande", async () => {
    const meta = await buildShareMetadata("album", target.ref, "es");
    const og = meta.openGraph as { url: string; locale: string; images: Array<{ url: string; width: number; height: number; alt: string }> };
    const version = shareTargetVersion(target);
    expect(og.url).toBe("https://ejemplo.app/es/album/metallica-master-of-puppets-abc");
    expect(og.locale).toBe("es_ES");
    expect(og.images[0]).toMatchObject({ width: 1200, height: 630, alt: target.imageAlt });
    expect(og.images[0]?.url).toBe(
      `https://ejemplo.app/api/share/image/album/${target.ref}?locale=es&format=link&v=${version}`,
    );
    expect(meta.alternates).toBeUndefined();
    expect((meta.twitter as { card: string }).card).toBe("summary_large_image");
    expect(og.url).not.toContain("via");
  });

  it("siempre piden el objetivo como anónimo, sea quien sea el visitante", async () => {
    await buildShareMetadata("profile", "u1", "en");
    expect(mocks.load).toHaveBeenCalledWith("profile", "u1", "en");
  });

  it("sin objeto visible anuncian la imagen genérica y no lo nombran", async () => {
    mocks.load.mockResolvedValue(null);
    const meta = await buildShareMetadata("profile", "u1", "es");
    expect(meta.title).toBeUndefined();
    expect(meta.description).toBeUndefined();
    const og = meta.openGraph as { title?: string; images: Array<{ url: string }> };
    expect(og.title).toBeUndefined();
    expect(og.images[0]?.url).toBe("https://ejemplo.app/api/share/image/profile/u1?locale=es&format=link");
  });

  it("la versión cambia cuando cambian los datos visibles", () => {
    const changed = { ...target, card: { ...target.card, subtitle: "Otro" } };
    expect(shareTargetVersion(changed)).not.toBe(shareTargetVersion(target));
  });

  it("codifica la referencia de una ceremonia en la URL de la imagen", () => {
    expect(shareImagePath("ceremony", "grammy:2025", "es", null)).toBe("/api/share/image/ceremony/grammy%3A2025?locale=es&format=link");
  });
});

describe("textos del enlace", () => {
  it("recorta la descripción a 160 caracteres en un límite de palabra", () => {
    const bio = "palabra ".repeat(60);
    const clipped = clipDescription(bio);
    expect(clipped.length).toBeLessThanOrEqual(160);
    expect(clipped.endsWith("palabra…")).toBe(true);
  });

  it("arma un nombre de archivo legible", () => {
    expect(downloadName("Metallica", "...And Justice for All")).toBe("metallica-and-justice-for-all");
    expect(downloadName(null, "")).toBe("compartir");
  });
});
