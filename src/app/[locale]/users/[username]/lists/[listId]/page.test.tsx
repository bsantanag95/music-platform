import { describe, expect, it, vi, beforeEach } from "vitest";
import { listSegment } from "@/lib/catalog-links";
import UserListDetailPage from "./page";

vi.mock("@/services/profiles/renamed-redirect", () => ({
  redirectIfRenamed: (...a: unknown[]) => mocks.redirectIfRenamed(...a),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const permanentRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_PERMANENT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (url: string) => redirect(url),
  permanentRedirect: (url: string) => permanentRedirect(url),
}));

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  getUserListDetail: vi.fn(),
  savedStateFor: vi.fn(),
  saveCountsFor: vi.fn(),
  countsByListId: vi.fn(),
  redirectIfRenamed: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/lists/lists", () => ({
  getUserListDetail: (...a: unknown[]) => mocks.getUserListDetail(...a),
}));
vi.mock("@/services/lists/saved-lists", () => ({
  savedStateFor: (...a: unknown[]) => mocks.savedStateFor(...a),
  saveCountsFor: (...a: unknown[]) => mocks.saveCountsFor(...a),
}));
vi.mock("@/services/journeys/progress", () => ({
  countsByListId: (...a: unknown[]) => mocks.countsByListId(...a),
}));
vi.mock("@/components/lists/ListDetailHeader", () => ({ ListDetailHeader: () => null }));
vi.mock("@/components/lists/ListItemsView", () => ({ ListItemsView: () => null }));
vi.mock("@/components/ui/EmptyState", () => ({ EmptyState: () => null }));

const LIST_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const SEGMENT = listSegment("Discos", LIST_ID);

function run(username = "ana", listId = SEGMENT) {
  return UserListDetailPage({ params: Promise.resolve({ username, listId }) });
}

describe("UserListDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirectIfRenamed.mockResolvedValue(undefined);
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.savedStateFor.mockResolvedValue(new Map());
    mocks.saveCountsFor.mockResolvedValue(new Map());
    mocks.countsByListId.mockResolvedValue(new Map());
  });

  it("segmento inválido → notFound", async () => {
    await expect(run("ana", "no-slug")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("perfil inexistente → redirectIfRenamed y notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.redirectIfRenamed).toHaveBeenCalledWith("ana", `/lists/${SEGMENT}`);
  });

  it("lista no visible → notFound", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "ana", username: "ana", displayName: null, relation: "none" });
    mocks.getUserListDetail.mockRejectedValue(new Error("LIST_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("dueño → redirige a /me/lists/[id] con el UUID decodificado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "ana", username: "ana", displayName: null, relation: "self" });
    await expect(run()).rejects.toThrow(`NEXT_REDIRECT:/es/me/lists/${LIST_ID}`);
  });

  it("lista visible → renderiza el detalle y no redirige", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "ana", username: "ana", displayName: "Ana", relation: "following" });
    mocks.getUserListDetail.mockResolvedValue({
      id: LIST_ID,
      entityType: "release-group",
      title: "Discos",
      items: [{ id: "i1", position: 1, target: { id: "t1", title: "X", artistName: null, coverThumbUrl: null } }],
    });
    const element = await run();
    expect(element).toBeTruthy();
    expect(mocks.getUserListDetail).toHaveBeenCalledWith("ana", LIST_ID, "viewer");
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it("UUID hexadecimal viejo → 308 a la dirección canónica con slug", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "ana", username: "ana", displayName: "Ana", relation: "following" });
    mocks.getUserListDetail.mockResolvedValue({
      id: LIST_ID,
      entityType: "release-group",
      title: "Discos",
      items: [],
    });
    await expect(run("ana", LIST_ID)).rejects.toThrow(
      `NEXT_PERMANENT_REDIRECT:/es/users/ana/lists/${SEGMENT}`,
    );
  });
});
