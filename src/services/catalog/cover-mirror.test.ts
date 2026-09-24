// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import sharp from "sharp";

vi.mock("@/db", () => ({
  db: { update: vi.fn() },
}));

vi.mock("@/services/storage", () => ({
  getStorageProvider: vi.fn(),
  StorageConfigError: class StorageConfigError extends Error {},
}));

const { db } = await import("@/db");
const { getStorageProvider, StorageConfigError } = await import("@/services/storage");
const { IMMUTABLE_CACHE_CONTROL, isCoverMirrorEnabled, mirrorCover, revalidateCover, takedownCover } =
  await import("./cover-mirror");

const MBID = "mbid-rg-1";
const COVER_URL = `https://coverartarchive.org/release-group/${MBID}/front-250`;

type PutCall = { key: string; body: Buffer; contentType: string; options?: { cacheControl?: string } };

function makeProvider(overrides: { put?: () => Promise<void>; delete?: () => Promise<void> } = {}) {
  const putCalls: PutCall[] = [];
  const deleteCalls: string[] = [];
  const provider = {
    putCalls,
    deleteCalls,
    put: vi.fn(async (key: string, body: Buffer, contentType: string, options?: PutCall["options"]) => {
      putCalls.push({ key, body, contentType, options });
      if (overrides.put) await overrides.put();
    }),
    delete: vi.fn(async (key: string) => {
      deleteCalls.push(key);
      if (overrides.delete) await overrides.delete();
    }),
    publicUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`),
  };
  vi.mocked(getStorageProvider).mockReturnValue(provider);
  return provider;
}

function makeUpdateChain() {
  const setValues: unknown[] = [];
  const chain = {
    setValues,
    set: vi.fn((values: unknown) => {
      setValues.push(values);
      return chain;
    }),
    where: vi.fn(async () => {}),
  };
  vi.mocked(db.update).mockReturnValue(chain as never);
  return chain;
}

async function solidPng(width: number, height: number, color: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: color, g: color, b: color } },
  })
    .png()
    .toBuffer();
}

const rg = { id: "rg-1", mbid: MBID, coverStorageKey: null as string | null };

describe("isCoverMirrorEnabled", () => {
  const original = process.env.COVER_ART_TAKEDOWN_EMAIL;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.COVER_ART_TAKEDOWN_EMAIL;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.COVER_ART_TAKEDOWN_EMAIL;
    else process.env.COVER_ART_TAKEDOWN_EMAIL = original;
  });

  it("es falso sin contacto de retiro", () => {
    expect(isCoverMirrorEnabled()).toBe(false);
  });

  it("es falso con contacto pero sin storage", () => {
    process.env.COVER_ART_TAKEDOWN_EMAIL = "retiro@ejemplo.com";
    vi.mocked(getStorageProvider).mockImplementation(() => {
      throw new StorageConfigError();
    });
    expect(isCoverMirrorEnabled()).toBe(false);
  });

  it("es verdadero con contacto y storage", () => {
    process.env.COVER_ART_TAKEDOWN_EMAIL = "retiro@ejemplo.com";
    makeProvider();
    expect(isCoverMirrorEnabled()).toBe(true);
  });
});

describe("mirrorCover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recodifica a WebP ≤250 px sin ampliar y usa caché inmutable", async () => {
    const provider = makeProvider();
    const chain = makeUpdateChain();

    const source = await solidPng(400, 300, 120);
    const result = await mirrorCover(rg, source);

    expect(provider.putCalls).toHaveLength(1);
    const call = provider.putCalls[0]!;
    expect(call.contentType).toBe("image/webp");
    expect(call.options?.cacheControl).toBe(IMMUTABLE_CACHE_CONTROL);

    const meta = await sharp(call.body).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(250);
    expect(meta.height).toBeLessThanOrEqual(250);

    expect(result).toBe(`https://cdn.example.com/${call.key}`);
    expect(chain.setValues[0]).toMatchObject({ coverStorageKey: call.key, coverThumbUrl: result });
  });

  it("no amplía una fuente más chica que 250 px", async () => {
    const provider = makeProvider();
    makeUpdateChain();

    await mirrorCover(rg, await solidPng(100, 80, 60));

    const meta = await sharp(provider.putCalls[0]!.body).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(80);
  });

  it("produce la misma clave para los mismos bytes y una distinta para otros", async () => {
    const provider = makeProvider();
    makeUpdateChain();

    const source = await solidPng(300, 300, 100);
    await mirrorCover(rg, source);
    await mirrorCover(rg, source);
    await mirrorCover(rg, await solidPng(300, 300, 200));

    const keys = provider.putCalls.map((call) => call.key);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });

  it("ante falla del put guarda la URL de CAA y deja la clave nula", async () => {
    makeProvider({ put: async () => { throw new Error("storage down"); } });
    const chain = makeUpdateChain();

    const result = await mirrorCover(rg, await solidPng(300, 300, 90));

    expect(result).toBe(COVER_URL);
    expect(chain.setValues[0]).toMatchObject({ coverStorageKey: null, coverThumbUrl: COVER_URL });
  });
});

describe("takedownCover", () => {
  beforeEach(() => vi.clearAllMocks());

  it("borra el objeto y anula la fila con la marca de retiro", async () => {
    const provider = makeProvider();
    const chain = makeUpdateChain();

    const result = await takedownCover({ id: "rg-1", coverStorageKey: "covers/mbid/hash.webp" });

    expect(provider.deleteCalls).toEqual(["covers/mbid/hash.webp"]);
    expect(result).toEqual({ hadObject: true, objectDeleted: true });
    expect(chain.setValues[0]).toMatchObject({
      coverThumbUrl: null,
      coverStorageKey: null,
    });
    expect((chain.setValues[0] as { coverBlockedAt: unknown }).coverBlockedAt).toBeInstanceOf(Date);
  });

  it("sin objeto espejado solo anula la fila", async () => {
    makeProvider();
    const chain = makeUpdateChain();

    const result = await takedownCover({ id: "rg-1", coverStorageKey: null });

    expect(result).toEqual({ hadObject: false, objectDeleted: false });
    expect(chain.setValues[0]).toMatchObject({ coverStorageKey: null });
  });
});

describe("revalidateCover", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no toca nada ante un error transitorio", async () => {
    makeProvider();
    const fetchMock = vi.fn(async () => ({ status: 500, ok: false }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await revalidateCover({ id: "rg-1", mbid: MBID, coverStorageKey: "old.webp" });

    expect(result).toBe("transient");
    expect(db.update).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("con 404 borra el objeto y anula la fila", async () => {
    const provider = makeProvider();
    const chain = makeUpdateChain();
    vi.stubGlobal("fetch", vi.fn(async () => ({ status: 404, ok: false })));

    const result = await revalidateCover({ id: "rg-1", mbid: MBID, coverStorageKey: "old.webp" });

    expect(result).toBe("missing");
    expect(provider.deleteCalls).toEqual(["old.webp"]);
    expect(chain.setValues[0]).toMatchObject({ coverStorageKey: null, coverThumbUrl: null });
    vi.unstubAllGlobals();
  });

  it("con hash distinto sube la clave nueva y borra la anterior", async () => {
    const provider = makeProvider();
    const chain = makeUpdateChain();
    const bytes = await solidPng(300, 300, 150);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      status: 200,
      ok: true,
      arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    })));

    const result = await revalidateCover({ id: "rg-1", mbid: MBID, coverStorageKey: "old.webp" });

    expect(result).toBe("updated");
    expect(provider.putCalls).toHaveLength(1);
    expect(provider.deleteCalls).toEqual(["old.webp"]);
    expect(chain.setValues[0]).toMatchObject({ coverStorageKey: provider.putCalls[0]!.key });
    vi.unstubAllGlobals();
  });
});
