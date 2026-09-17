import { beforeEach, describe, expect, it, vi } from "vitest";
import { getIdentityCardPreview } from "./identity-preview";

const mocks = vi.hoisted(() => ({
  getProfileByUsername: vi.fn(),
  getExtendedIdentityByUsername: vi.fn(),
  getShowcase: vi.fn(),
}));

vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));
vi.mock("./identity", () => ({ getExtendedIdentityByUsername: mocks.getExtendedIdentityByUsername }));
vi.mock("./showcase", () => ({ getShowcase: mocks.getShowcase }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getExtendedIdentityByUsername.mockResolvedValue({ bio: "Catalogando desde 2019." });
});

describe("getIdentityCardPreview", () => {
  it("devuelve la tarjeta de identidad, la bio y la relación cuando el perfil es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      relation: "following",
      accessible: true,
    });
    const identityCard = {
      artist: { type: "artist" as const, id: "a1", title: "Radiohead", artistName: null, coverThumbUrl: null },
      album: null,
      anthem: null,
    };
    mocks.getShowcase.mockResolvedValue({ pinned: [], anthem: null, identityCard });

    const preview = await getIdentityCardPreview("ana", "viewer1");

    expect(preview).toEqual({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      bio: "Catalogando desde 2019.",
      relation: "following",
      viewerAuthenticated: true,
      accessible: true,
      identityCard,
    });
    expect(mocks.getShowcase).toHaveBeenCalledWith("u1");
  });

  it("no expone la tarjeta cuando el perfil es privado y el visitante no tiene acceso, pero sí la bio", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      relation: "none",
      accessible: false,
    });

    const preview = await getIdentityCardPreview("ana", null);

    expect(preview).toEqual({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      bio: "Catalogando desde 2019.",
      relation: "none",
      viewerAuthenticated: false,
      accessible: false,
      identityCard: null,
    });
    expect(mocks.getShowcase).not.toHaveBeenCalled();
  });
});
