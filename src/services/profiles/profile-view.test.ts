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
  pronounSet: "she",
  country: "CL",
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
    expect(view.followerCount).toBe(1);
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

describe("getProfileView: datos personales (país, ciudad y pronombres)", () => {
  const withOther = { ...identity, pronounSet: null, pronouns: "ellx" };

  it("un perfil público los entrega a cualquiera", async () => {
    mocks.getExtendedIdentityByUsername.mockResolvedValue({ ...identity, profileVisibility: "public" });
    mocks.getProfileByUsername.mockResolvedValue(relation({ accessible: true }));
    const view = await getProfileView("ana", null);
    expect(view.country).toBe("CL");
    expect(view.location).toBe("Quilpué");
    expect(view.pronounSet).toBe("she");
  });

  it("un anónimo en un perfil privado NO los recibe, ni la clave ni el texto de «Otro»", async () => {
    mocks.getExtendedIdentityByUsername.mockResolvedValue(withOther);
    mocks.getProfileByUsername.mockResolvedValue(relation({ accessible: false }));
    const view = await getProfileView("ana", null);
    expect(view.country).toBeNull();
    expect(view.location).toBeNull();
    expect(view.pronouns).toBeNull();
    expect(view.pronounSet).toBeNull();
    expect(JSON.stringify(view)).not.toMatch(/ellx|Quilpué|"CL"/);
  });

  it("alguien con una solicitud de seguimiento pendiente tampoco los recibe", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ relation: "requested", accessible: false }));
    const view = await getProfileView("ana", "v1");
    expect(view.country).toBeNull();
    expect(view.location).toBeNull();
    expect(view.pronounSet).toBeNull();
  });

  it("un seguidor aprobado los recibe", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ relation: "following", accessible: true }));
    const view = await getProfileView("ana", "v1");
    expect(view.country).toBe("CL");
    expect(view.location).toBe("Quilpué");
    expect(view.pronounSet).toBe("she");
  });

  it("el dueño los recibe siempre", async () => {
    mocks.getExtendedIdentityByUsername.mockResolvedValue(withOther);
    mocks.getProfileByUsername.mockResolvedValue(relation({ relation: "self", accessible: true }));
    const view = await getProfileView("ana", "u1");
    expect(view.country).toBe("CL");
    expect(view.location).toBe("Quilpué");
    expect(view.pronouns).toBe("ellx");
  });

  it("la bio, los enlaces y los contadores no cambian para quien no tiene acceso", async () => {
    mocks.getProfileByUsername.mockResolvedValue(relation({ accessible: false }));
    const view = await getProfileView("ana", null);
    expect(view.bio).toBe("una bio");
    expect(view.links).toEqual([]);
    expect(view.followerCount).toBe(1);
    expect(view.followingCount).toBe(2);
    expect(view.displayName).toBe("Ana");
  });
});
