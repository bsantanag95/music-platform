// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  profile: vi.fn(),
  showcase: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/profiles/identity", () => ({ getExtendedIdentityByUsername: mocks.identity }));
vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.profile }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: mocks.showcase }));

import { loadProfileTargetByUsername } from "./profile";

const identity = {
  id: "8d2c0c34-6a0f-4f61-9d7b-1f8a2c3d4e5f",
  username: "ana",
  displayName: "Ana Pérez",
  bio: "Escucho metal y jazz.",
  avatarUrl: null,
  followerCount: 12,
  followingCount: 30,
};

const album = { type: "release-group", id: "rg1", title: "Kind of Blue", artistName: "Miles Davis", coverThumbUrl: "https://coverartarchive.org/a" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.mockResolvedValue(identity);
  mocks.profile.mockResolvedValue({ id: identity.id, accessible: true });
  mocks.showcase.mockResolvedValue({ pinned: [], identityCard: { album, anthem: null, artist: null } });
});

describe("objetivo del perfil", () => {
  it("se calcula como visitante anónimo", async () => {
    await loadProfileTargetByUsername("ana", "es");
    expect(mocks.profile).toHaveBeenCalledWith("ana", null);
  });

  it("perfil público: bio como descripción y carátulas de la Tarjeta de Identidad", async () => {
    const target = await loadProfileTargetByUsername("ana", "es");
    expect(target?.ref).toBe(identity.id);
    expect(target?.canonicalPath).toBe("/es/users/ana");
    expect(target?.description).toBe("Escucho metal y jazz.");
    expect(target?.card.media).toMatchObject({ type: "identity", monogram: "A", covers: [{ fallbackTitle: "Kind of Blue" }] });
    expect(target?.card.meta).toEqual(["12 seguidores", "30 siguiendo"]);
  });

  it("perfil privado: identidad pública, sin bio ni Tarjeta de Identidad", async () => {
    mocks.profile.mockResolvedValue({ id: identity.id, accessible: false });
    const target = await loadProfileTargetByUsername("ana", "es");
    expect(mocks.showcase).not.toHaveBeenCalled();
    expect(target?.description).toBe("Ana Pérez tiene un perfil privado.");
    expect(JSON.stringify(target)).not.toContain("Escucho metal");
    expect(target?.card.media).toMatchObject({ type: "identity", covers: [] });
    expect(target?.card.meta[0]).toBe("Perfil privado");
  });

  it("cuenta desactivada o inexistente: sin objetivo (imagen genérica)", async () => {
    mocks.identity.mockResolvedValue(null);
    mocks.profile.mockRejectedValue(new Error("USER_NOT_FOUND"));
    expect(await loadProfileTargetByUsername("ana", "es")).toBeNull();
  });

  it("sin nombre visible usa el @usuario sin repetirlo", async () => {
    mocks.identity.mockResolvedValue({ ...identity, displayName: null });
    const target = await loadProfileTargetByUsername("ana", "en");
    expect(target?.title).toBe("@ana");
    expect(target?.card.subtitle).toBeNull();
    expect(target?.description).toBe("Escucho metal y jazz.");
  });
});
