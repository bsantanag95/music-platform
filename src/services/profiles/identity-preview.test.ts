import { beforeEach, describe, expect, it, vi } from "vitest";
import { getIdentityCardPreview } from "./identity-preview";

const mocks = vi.hoisted(() => ({
  getProfileByUsername: vi.fn(),
  getShowcase: vi.fn(),
}));

vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));
vi.mock("./showcase", () => ({ getShowcase: mocks.getShowcase }));

beforeEach(() => vi.clearAllMocks());

describe("getIdentityCardPreview", () => {
  it("devuelve la tarjeta de identidad cuando el perfil es accesible", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      accessible: true,
    });
    const identityCard = {
      artist: { type: "artist" as const, id: "a1", title: "Radiohead", artistName: null, coverThumbUrl: null },
      album: null,
      anthem: null,
    };
    mocks.getShowcase.mockResolvedValue({ pinned: [], anthem: null, identityCard });

    const preview = await getIdentityCardPreview("ana", "viewer1");

    expect(preview).toEqual({ username: "ana", displayName: "Ana", accessible: true, identityCard });
    expect(mocks.getShowcase).toHaveBeenCalledWith("u1");
  });

  it("no expone la tarjeta cuando el perfil es privado y el visitante no tiene acceso", async () => {
    mocks.getProfileByUsername.mockResolvedValue({
      id: "u1",
      username: "ana",
      displayName: "Ana",
      accessible: false,
    });

    const preview = await getIdentityCardPreview("ana", null);

    expect(preview).toEqual({ username: "ana", displayName: "Ana", accessible: false, identityCard: null });
    expect(mocks.getShowcase).not.toHaveBeenCalled();
  });
});
