import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StorageErrorCode } from "@/services/storage";

const mocks = vi.hoisted(() => {
  const state = {
    selectResult: [] as unknown[],
  };

  return {
    state,
    requireUser: vi.fn(),
    consumeAuthAttempt: vi.fn(),
    imageService: {
      upload: vi.fn(),
      deleteImage: vi.fn(),
      resolveUrl: vi.fn(),
    },
    db: {
      select: vi.fn(),
      update: vi.fn(),
    },
  };
});

vi.mock("@/services/auth/authorization", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/services/auth/rate-limit", () => ({ consumeAuthAttempt: mocks.consumeAuthAttempt }));
vi.mock("@/services/storage", () => ({
  imageService: mocks.imageService,
  StorageError: class StorageError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "StorageError";
      this.code = code;
    }
  },
  StorageConfigError: class StorageConfigError extends Error {
    constructor() {
      super("No hay un proveedor de storage configurado");
      this.name = "StorageConfigError";
    }
  },
}));
vi.mock("@/db", () => ({ db: mocks.db }));
vi.mock("@/db/schema", () => ({
  appUser: { __name: "app_user", id: "app_user.id", avatarImageId: "app_user.avatar_image_id" },
}));
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ op: "eq", a, b })),
}));

import { DELETE, PUT } from "./route";

const user = { id: "00000000-0000-4000-8000-000000000001" };
const imageRow = { id: "img-1", storageKey: "avatar/uuid.webp" };

function setupDbMocks() {
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };
  selectChain.from.mockReturnValue(selectChain);
  selectChain.where.mockReturnValue(selectChain);
  selectChain.limit.mockImplementation(() => Promise.resolve(mocks.state.selectResult));

  const updateChain = {
    set: vi.fn(),
    where: vi.fn(),
  };
  updateChain.set.mockReturnValue(updateChain);
  updateChain.where.mockImplementation(() => Promise.resolve(undefined));

  mocks.db.select.mockReturnValue(selectChain);
  mocks.db.update.mockReturnValue(updateChain);
}

function createMockRequest(file: File | null, headers: Record<string, string> = {}) {
  const formData = new FormData();
  if (file) formData.append("file", file);

  return {
    method: "PUT",
    headers: new Headers(headers),
    formData: () => Promise.resolve(formData),
  } as unknown as Request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue(user);
  mocks.consumeAuthAttempt.mockReturnValue(true);
  mocks.imageService.upload.mockResolvedValue(imageRow);
  mocks.imageService.resolveUrl.mockReturnValue("https://cdn.example.com/avatar/uuid.webp");
  mocks.imageService.deleteImage.mockResolvedValue(undefined);
  mocks.state.selectResult = [];
  setupDbMocks();
});

describe("PUT /api/me/profile/avatar", () => {
  it("sube una imagen sin avatar previo y devuelve la URL", async () => {
    mocks.state.selectResult = [{ avatarImageId: null }];
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ avatarUrl: "https://cdn.example.com/avatar/uuid.webp" });
    expect(mocks.imageService.upload).toHaveBeenCalled();
    expect(mocks.imageService.deleteImage).not.toHaveBeenCalled();
  });

  it("reemplaza el avatar anterior y borra la imagen vieja", async () => {
    mocks.state.selectResult = [{ avatarImageId: "old-img-id" }];
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(200);
    expect(mocks.imageService.deleteImage).toHaveBeenCalledWith("old-img-id");
  });

  it("si falla la subida, conserva el avatar anterior", async () => {
    const { StorageError } = await import("@/services/storage");
    mocks.imageService.upload.mockRejectedValue(new StorageError("UNSUPPORTED_FORMAT", "Formato no soportado"));
    mocks.state.selectResult = [{ avatarImageId: null }];
    const file = new File([new Uint8Array(100)], "foto.bmp", { type: "image/bmp" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("IMAGE_UNSUPPORTED_FORMAT");
    expect(mocks.imageService.deleteImage).not.toHaveBeenCalled();
  });

  it("si falla el borrado del avatar anterior, la subida igual tiene éxito", async () => {
    mocks.state.selectResult = [{ avatarImageId: "old-img-id" }];
    mocks.imageService.deleteImage.mockRejectedValue(new Error("fallo de red"));
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/me/profile/avatar", () => {
  it("borra un avatar existente y devuelve null", async () => {
    mocks.state.selectResult = [{ avatarImageId: "old-img-id" }];
    const res = await DELETE();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ avatarUrl: null });
    expect(mocks.imageService.deleteImage).toHaveBeenCalledWith("old-img-id");
  });

  it("sin avatar previo es un no-op exitoso", async () => {
    mocks.state.selectResult = [{ avatarImageId: null }];
    const res = await DELETE();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ avatarUrl: null });
    expect(mocks.imageService.deleteImage).not.toHaveBeenCalled();
  });
});

describe("rechazos antes de bufferar el archivo", () => {
  it("rechaza por Content-Length antes de leer el body", async () => {
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file, { "content-length": String(11 * 1024 * 1024) }));

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.code).toBe("IMAGE_TOO_LARGE");
    expect(mocks.imageService.upload).not.toHaveBeenCalled();
  });

  it("rechaza por file.size antes de bufferar", async () => {
    const bigBuffer = new Uint8Array(11 * 1024 * 1024);
    const file = new File([bigBuffer], "grande.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.code).toBe("IMAGE_TOO_LARGE");
    expect(mocks.imageService.upload).not.toHaveBeenCalled();
  });

  it("rate limiting bloquea sin procesar el archivo", async () => {
    mocks.consumeAuthAttempt.mockReturnValue(false);
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("RATE_LIMITED");
    expect(mocks.imageService.upload).not.toHaveBeenCalled();
  });
});

describe("mapeo de errores de storage a ApiError", () => {
  async function expectStorageMapping(
    storageCode: StorageErrorCode,
    expectedApiCode: string,
    expectedStatus: number,
  ) {
    const mod = await import("@/services/storage");
    mocks.imageService.upload.mockRejectedValue(new mod.StorageError(storageCode, "mensaje"));
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(expectedStatus);
    const body = await res.json();
    expect(body.code).toBe(expectedApiCode);
  }

  it("UNSUPPORTED_FORMAT → IMAGE_UNSUPPORTED_FORMAT (400)", async () => {
    await expectStorageMapping("UNSUPPORTED_FORMAT", "IMAGE_UNSUPPORTED_FORMAT", 400);
  });

  it("FILE_TOO_LARGE → IMAGE_TOO_LARGE (413)", async () => {
    await expectStorageMapping("FILE_TOO_LARGE", "IMAGE_TOO_LARGE", 413);
  });

  it("DIMENSIONS_EXCEEDED → IMAGE_DIMENSIONS_EXCEEDED (400)", async () => {
    await expectStorageMapping("DIMENSIONS_EXCEEDED", "IMAGE_DIMENSIONS_EXCEEDED", 400);
  });

  it("DIMENSIONS_INSUFFICIENT → IMAGE_DIMENSIONS_INSUFFICIENT (400)", async () => {
    await expectStorageMapping("DIMENSIONS_INSUFFICIENT", "IMAGE_DIMENSIONS_INSUFFICIENT", 400);
  });

  it("códigos desconocidos de StorageError caen como INTERNAL_ERROR (500)", async () => {
    await expectStorageMapping("UNKNOWN_KIND", "INTERNAL_ERROR", 500);
  });

  it("StorageConfigError cae como INTERNAL_ERROR sin filtrar el código interno", async () => {
    const mod = await import("@/services/storage");
    mocks.imageService.upload.mockRejectedValue(new mod.StorageConfigError());
    const file = new File([new Uint8Array(100)], "foto.png", { type: "image/png" });
    const res = await PUT(createMockRequest(file));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.error).not.toContain("STORAGE_CONFIG_MISSING");
  });
});
