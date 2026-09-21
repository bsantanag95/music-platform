import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getProfileByUsername: vi.fn(), getExtendedIdentityByUsername: vi.fn() }));

vi.mock("@/services/social/profiles", () => ({ getProfileByUsername: mocks.getProfileByUsername }));
vi.mock("./identity", () => ({ getExtendedIdentityByUsername: mocks.getExtendedIdentityByUsername }));

import { getProfileView } from "./profile-view";

const identity = {
  id: "u1",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "private",
  bio: "una bio",
  pronouns: null,
  location: "Quilpué",
  timezone: "America/Santiago",
  showLocalTime: true,
  selfRoles: ["collector", "dj"],
  genres: ["jazz", "shoegaze"],
  listeningFormats: ["vinyl"],
  prompts: [{ promptKey: "first-record", answer: "Un casete", position: 0 }],
  avatarUrl: null,
  memberSince: new Date("2025-01-01"),
  links: [],
  followerCount: 1,
  followingCount: 2,
};

const relation = (over: Record<string, unknown>) => ({ relation: "none", accessible: false, blockedByMe: false, ...over });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getExtendedIdentityByUsername.mockResolvedValue(identity);
});

describe("getProfileView: identidad musical", () => {
  it("un perfil accesible entrega la identidad musical y la hora local", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ accessible: true }));
    const view = await getProfileView("ana", "v1");
    expect(view.selfRoles).toEqual(["collector", "dj"]);
    expect(view.genres).toEqual(["jazz", "shoegaze"]);
    expect(view.prompts).toHaveLength(1);
    expect(view.showLocalTime).toBe(true);
  });

  it("un perfil privado sin acceso NO entrega la identidad musical ni la hora local", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ accessible: false }));
    const view = await getProfileView("ana", "v1");
    expect(view.selfRoles).toEqual([]);
    expect(view.genres).toEqual([]);
    expect(view.listeningFormats).toEqual([]);
    expect(view.prompts).toEqual([]);
    expect(view.showLocalTime).toBe(false);
    // La identidad pública de siempre no cambia.
    expect(view.bio).toBe("una bio");
    expect(view.location).toBe("Quilpué");
  });

  it("un visitante anónimo de un perfil privado tampoco la recibe", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ accessible: false }));
    expect((await getProfileView("ana", null)).genres).toEqual([]);
  });

  it("el dueño siempre ve la suya", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ relation: "self", accessible: true }));
    const view = await getProfileView("ana", "u1");
    expect(view.selfRoles).toEqual(["collector", "dj"]);
    expect(view.isOwner).toBe(true);
  });
});
