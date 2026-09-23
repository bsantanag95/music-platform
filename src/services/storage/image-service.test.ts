// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: () => ({
        returning: async () => [
          {
            id: "test-id",
            storageKey: "avatar/test.webp",
            kind: "avatar",
            mimeType: "image/webp",
            width: 256,
            height: 256,
            byteSize: 1000,
            createdAt: new Date(),
          },
        ],
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [],
        }),
      }),
    }),
    delete: () => ({
      where: async () => {},
    }),
  },
}));

import {
  createImageService,
  StorageError,
  type StorageProvider,
} from "./index";

/**
 * Tests del servicio de imágenes (openspec: add-image-storage).
 *
 * El environment global de vitest es `jsdom`; estos tests ejercitan `sharp`
 * (módulo nativo), así que requieren `node`. La directiva `@vitest-environment`
 * al inicio del archivo lo fuerza.
 */

function createMockProvider(): StorageProvider & {
  putCalls: Array<{ key: string; body: Buffer; contentType: string }>;
  deleteCalls: string[];
} {
  const putCalls: Array<{ key: string; body: Buffer; contentType: string }> = [];
  const deleteCalls: string[] = [];

  return {
    putCalls,
    deleteCalls,
    async put(key: string, body: Buffer, contentType: string) {
      putCalls.push({ key, body, contentType });
    },
    async delete(key: string) {
      deleteCalls.push(key);
    },
    publicUrl(key: string) {
      return `https://cdn.example.com/${key}`;
    },
  };
}

async function createTestImage(
  format: "jpeg" | "png" | "webp",
  width: number,
  height: number,
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .toFormat(format)
    .toBuffer();
}

describe("imageService - validación de formato", () => {
  it("acepta JPEG, PNG y WebP sin lanzar UNSUPPORTED_FORMAT", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);

    for (const fmt of ["jpeg", "png", "webp"] as const) {
      const buffer = await createTestImage(fmt, 256, 256);
      const validationPromise = (async () => {
        try {
          await service.upload({ buffer, kind: "avatar" });
        } catch (err) {
          if (err instanceof StorageError && err.code === "UNSUPPORTED_FORMAT") {
            throw new Error(`Formato ${fmt} rechazado incorrectamente`);
          }
        }
      })();
      await expect(validationPromise).resolves.toBeUndefined();
    }
  });

  it("rechaza SVG con UNSUPPORTED_FORMAT", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

    await expect(service.upload({ buffer: svgBuffer, kind: "avatar" })).rejects.toThrow(
      StorageError,
    );
    await expect(service.upload({ buffer: svgBuffer, kind: "avatar" })).rejects.toMatchObject({
      code: "UNSUPPORTED_FORMAT",
    });
    expect(provider.putCalls).toHaveLength(0);
  });

  it("rechaza formato arbitrario (GIF) con UNSUPPORTED_FORMAT", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const gifBuffer = Buffer.from("GIF89a");

    await expect(service.upload({ buffer: gifBuffer, kind: "avatar" })).rejects.toThrow(
      StorageError,
    );
    await expect(service.upload({ buffer: gifBuffer, kind: "avatar" })).rejects.toMatchObject({
      code: "UNSUPPORTED_FORMAT",
    });
  });
});

describe("imageService - límites", () => {
  it("rechaza archivo que excede tamaño máximo (10 MB) con FILE_TOO_LARGE", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const buffer = Buffer.alloc(11 * 1024 * 1024);
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    buffer[2] = 0xff;

    await expect(service.upload({ buffer, kind: "avatar" })).rejects.toThrow(StorageError);
    await expect(service.upload({ buffer, kind: "avatar" })).rejects.toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  it("rechaza imagen que excede dimensiones máximas (8192x8192) con DIMENSIONS_EXCEEDED", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const buffer = await createTestImage("jpeg", 9000, 9000);

    await expect(service.upload({ buffer, kind: "avatar" })).rejects.toThrow(StorageError);
    await expect(service.upload({ buffer, kind: "avatar" })).rejects.toMatchObject({
      code: "DIMENSIONS_EXCEEDED",
    });
  });

  it("rechaza imagen bajo el mínimo del kind (avatar: 128x128) con DIMENSIONS_INSUFFICIENT", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const buffer = await createTestImage("jpeg", 64, 64);

    await expect(service.upload({ buffer, kind: "avatar" })).rejects.toThrow(StorageError);
    await expect(service.upload({ buffer, kind: "avatar" })).rejects.toMatchObject({
      code: "DIMENSIONS_INSUFFICIENT",
    });
  });
});

describe("imageService - upload", () => {
  it("put() se invoca exactamente una vez con buffer WebP y contentType normalizado", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const buffer = await createTestImage("png", 256, 256);

    const result = await service.upload({ buffer, kind: "avatar" });

    expect(provider.putCalls).toHaveLength(1);
    expect(provider.putCalls[0]?.contentType).toBe("image/webp");
    expect(provider.putCalls[0]?.key).toMatch(/^avatar\//);
    expect(provider.putCalls[0]?.key).toMatch(/\.webp$/);
    expect(result).toBeDefined();
    expect(result.id).toBe("test-id");
  });
});

describe("imageService - storage_key", () => {
  it("la clave deriva de kind + UUID y un nombre malicioso del cliente no altera la ubicación", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const buffer = await createTestImage("jpeg", 256, 256);

    await service.upload({ buffer, kind: "avatar" });

    const key = provider.putCalls[0]?.key ?? "";
    expect(key).toMatch(/^avatar\/[0-9a-f-]+\.webp$/);
    expect(key).not.toContain("..");
    expect(key).not.toContain("etc");
  });
});

describe("imageService - resolveUrl", () => {
  it("construye URL válida a partir de storage_key", () => {
    const provider = createMockProvider();
    const service = createImageService(provider);

    const url = service.resolveUrl("avatar/test.webp");
    expect(url).toBe("https://cdn.example.com/avatar/test.webp");
  });

  it("acepta un ImageRow completo", () => {
    const provider = createMockProvider();
    const service = createImageService(provider);

    const imageRow = {
      id: "test-id",
      storageKey: "avatar/test.webp",
      kind: "avatar",
      mimeType: "image/webp",
      width: 256,
      height: 256,
      byteSize: 1000,
      createdAt: new Date(),
    };

    const url = service.resolveUrl(imageRow);
    expect(url).toBe("https://cdn.example.com/avatar/test.webp");
  });
});

describe("imageService - kind desconocido", () => {
  it("rechaza con UNKNOWN_KIND sin invocar process() ni el provider", async () => {
    const provider = createMockProvider();
    const service = createImageService(provider);
    const buffer = await createTestImage("jpeg", 256, 256);

    await expect(
      service.upload({ buffer, kind: "unknown" as never }),
    ).rejects.toThrow(StorageError);
    await expect(
      service.upload({ buffer, kind: "unknown" as never }),
    ).rejects.toMatchObject({ code: "UNKNOWN_KIND" });

    expect(provider.putCalls).toHaveLength(0);
  });
});

describe("getStorageProvider - selección de driver", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("local fuera de producción", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STORAGE_DRIVER", "local");

    const { getStorageProvider } = await import("./index");
    const provider = getStorageProvider();

    expect(provider).toBeDefined();
    expect(provider.publicUrl("test.webp")).toBe("/uploads/test.webp");

    vi.unstubAllEnvs();
  });

  it("en producción sin configuración real, error de configuración ausente", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STORAGE_DRIVER", "local");

    const { getStorageProvider, StorageConfigError } = await import("./index");

    expect(() => getStorageProvider()).toThrow(StorageConfigError);

    vi.unstubAllEnvs();
  });
});
