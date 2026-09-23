import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    deletes: [] as string[],
    deleteError: null as unknown,
    avatarImageId: null as string | null,
  };

  function chain(next: () => unknown): unknown {
    const target: unknown = new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === "then") {
          const result = Promise.resolve().then(next);
          return result.then.bind(result);
        }
        return () => target;
      },
    });
    return target;
  }

  const executor = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(state.avatarImageId ? [{ avatarImageId: state.avatarImageId }] : []),
        }),
      }),
    }),
    delete: (table: { __name: string }) =>
      chain(() => {
        state.deletes.push(table.__name);
        if (state.deleteError && table.__name === "app_user") throw state.deleteError;
        return undefined;
      }),
  };
  const db = {
    ...executor,
    transaction: async (callback: (tx: typeof executor) => Promise<unknown>) => callback(executor),
  };
  return { state, db, requireRecentAuth: vi.fn(), imageService: { deleteImage: vi.fn() } };
});

vi.mock("@/db", () => ({ db: h.db }));
vi.mock("@/db/schema", () => ({
  appUser: { __name: "app_user", id: "app_user.id", avatarImageId: "app_user.avatar_image_id" },
  session: { __name: "session", userId: "session.user_id" },
}));
vi.mock("./recent-auth", () => ({ requireRecentAuth: h.requireRecentAuth }));
vi.mock("@/services/storage", () => ({ imageService: h.imageService }));

import { deleteAccount } from "./account-lifecycle";
import type { ResolvedSession } from "./sessions";

const current = {
  sessionId: "s1",
  sessionCreatedAt: new Date(),
  user: { id: "u1", username: "ana" },
} as unknown as ResolvedSession;

beforeEach(() => {
  vi.clearAllMocks();
  h.state.deletes = [];
  h.state.deleteError = null;
  h.state.avatarImageId = null;
  h.requireRecentAuth.mockResolvedValue(undefined);
  h.imageService.deleteImage.mockResolvedValue(undefined);
});

describe("deleteAccount: limpieza de avatar", () => {
  it("borra la imagen del avatar después de eliminar la cuenta", async () => {
    h.state.avatarImageId = "img-avatar-123";
    await deleteAccount(current, { username: "ana" });

    expect(h.state.deletes).toEqual(["app_user"]);
    expect(h.imageService.deleteImage).toHaveBeenCalledWith("img-avatar-123");
  });

  it("no intenta borrar imagen si no había avatar", async () => {
    h.state.avatarImageId = null;
    await deleteAccount(current, { username: "ana" });

    expect(h.state.deletes).toEqual(["app_user"]);
    expect(h.imageService.deleteImage).not.toHaveBeenCalled();
  });

  it("el fallo de deleteImage no impide la eliminación de la cuenta", async () => {
    h.state.avatarImageId = "img-avatar-123";
    h.imageService.deleteImage.mockRejectedValue(new Error("fallo de red"));

    await expect(deleteAccount(current, { username: "ana" })).resolves.toBeUndefined();
    expect(h.state.deletes).toEqual(["app_user"]);
    expect(h.imageService.deleteImage).toHaveBeenCalledWith("img-avatar-123");
  });
});
