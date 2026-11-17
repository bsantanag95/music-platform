import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listUserDiary: vi.fn(),
  getProfileReviews: vi.fn(),
  getProfileRatingHighlights: vi.fn(),
  getFavoritesPreview: vi.fn(),
  listUserLists: vi.fn(),
  listVisibleCaminos: vi.fn(),
  getCollectionPreview: vi.fn(),
  getConcertPreview: vi.fn(),
  getProfileInRotation: vi.fn(),
  getShowcase: vi.fn(),
  getTasteFingerprint: vi.fn(),
  listProfileFollowedArtists: vi.fn(),
}));

vi.mock("@/services/diary/diary", () => ({ listUserDiary: mocks.listUserDiary }));
vi.mock("@/services/profiles/reviews", () => ({ getProfileReviews: mocks.getProfileReviews }));
vi.mock("@/services/rating-highlights/rating-highlights", () => ({
  getProfileRatingHighlights: mocks.getProfileRatingHighlights,
}));
vi.mock("@/services/favorites/favorites", () => ({ getFavoritesPreview: mocks.getFavoritesPreview }));
vi.mock("@/services/lists/lists", () => ({ listUserLists: mocks.listUserLists }));
vi.mock("@/services/camino/camino", () => ({ listVisibleCaminos: mocks.listVisibleCaminos }));
vi.mock("@/services/collection/collection", () => ({ getCollectionPreview: mocks.getCollectionPreview }));
vi.mock("@/services/concerts/concerts", () => ({ getConcertPreview: mocks.getConcertPreview }));
vi.mock("@/services/profiles/in-rotation", () => ({ getProfileInRotation: mocks.getProfileInRotation }));
vi.mock("@/services/profiles/showcase", () => ({ getShowcase: mocks.getShowcase }));
vi.mock("@/services/profiles/stats", () => ({ getTasteFingerprint: mocks.getTasteFingerprint }));
vi.mock("@/services/profiles/exploration", () => ({
  listProfileFollowedArtists: mocks.listProfileFollowedArtists,
}));

import { profileHasVisibleContent } from "./visible-content";

const profile = {
  id: "owner",
  username: "ana",
  selfRoles: [],
  genres: [],
  listeningFormats: [],
  prompts: [],
};

function emptyEverything() {
  mocks.listUserDiary.mockResolvedValue({ entries: [], totalCount: 0 });
  mocks.getProfileReviews.mockResolvedValue(null);
  mocks.getProfileRatingHighlights.mockResolvedValue([]);
  mocks.getFavoritesPreview.mockResolvedValue({ counts: { artist: 0, "release-group": 0, recording: 0 } });
  mocks.listUserLists.mockResolvedValue({ lists: [], totalCount: 0 });
  mocks.listVisibleCaminos.mockResolvedValue({ caminos: [], totalCount: 0 });
  mocks.getCollectionPreview.mockResolvedValue({ totalEntries: 0, artists: [] });
  mocks.getConcertPreview.mockResolvedValue({ entries: [], total: 0 });
  mocks.getProfileInRotation.mockResolvedValue(null);
  mocks.getShowcase.mockResolvedValue({ pinned: [] });
  mocks.getTasteFingerprint.mockResolvedValue(null);
  mocks.listProfileFollowedArtists.mockResolvedValue({ artists: [], totalCount: 0 });
}

beforeEach(() => {
  vi.clearAllMocks();
  emptyEverything();
});

describe("profileHasVisibleContent", () => {
  it("falso cuando ninguna fuente tiene nada visible", async () => {
    expect(await profileHasVisibleContent(profile, null)).toBe(false);
  });

  it("consulta cada fuente con la vista de quien mira", async () => {
    await profileHasVisibleContent(profile, "viewer");
    expect(mocks.listUserDiary).toHaveBeenCalledWith("ana", "viewer", 1, 1);
    expect(mocks.getFavoritesPreview).toHaveBeenCalledWith("ana", "viewer");
    expect(mocks.getShowcase).toHaveBeenCalledWith("owner");
  });

  // Una sección nueva del perfil debe sumarse a esta lista y al servicio.
  const sources: [string, () => void][] = [
    ["diario", () => mocks.listUserDiary.mockResolvedValue({ entries: [{}], totalCount: 1 })],
    ["reseñas", () => mocks.getProfileReviews.mockResolvedValue({ reviews: [{}], total: 1 })],
    ["valoraciones destacadas", () => mocks.getProfileRatingHighlights.mockResolvedValue([{}])],
    [
      "favoritos",
      () => mocks.getFavoritesPreview.mockResolvedValue({ counts: { artist: 0, "release-group": 1, recording: 0 } }),
    ],
    ["listas", () => mocks.listUserLists.mockResolvedValue({ lists: [{}], totalCount: 1 })],
    ["Caminos", () => mocks.listVisibleCaminos.mockResolvedValue({ caminos: [{}], totalCount: 1 })],
    ["colección", () => mocks.getCollectionPreview.mockResolvedValue({ totalEntries: 2, artists: [] })],
    ["conciertos", () => mocks.getConcertPreview.mockResolvedValue({ entries: [{}], total: 1 })],
    ["En rotación", () => mocks.getProfileInRotation.mockResolvedValue({})],
    ["Empieza por aquí", () => mocks.getShowcase.mockResolvedValue({ pinned: [{}] })],
    ["huella", () => mocks.getTasteFingerprint.mockResolvedValue({ decades: [{}], summary: [] })],
    ["artistas seguidos", () => mocks.listProfileFollowedArtists.mockResolvedValue({ artists: [{}], totalCount: 1 })],
  ];

  it.each(sources)("verdadero con solo %s", async (_name, arrange) => {
    arrange();
    expect(await profileHasVisibleContent(profile, null)).toBe(true);
  });

  it("verdadero con solo la ficha musical, sin consultar nada más", async () => {
    expect(await profileHasVisibleContent({ ...profile, genres: ["jazz"] }, null)).toBe(true);
    expect(mocks.listUserDiary).not.toHaveBeenCalled();
  });
});
