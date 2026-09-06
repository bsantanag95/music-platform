import { describe, expect, it, vi, beforeEach } from "vitest";
import UserListDetailPage from "./page";

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
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (url: string) => redirect(url),
}));

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  getUserListDetail: vi.fn(),
  savedStateFor: vi.fn(),
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
}));
vi.mock("@/components/lists/ListDetailHeader", () => ({ ListDetailHeader: () => null }));
vi.mock("@/components/lists/ListItemsView", () => ({ ListItemsView: () => null }));
vi.mock("@/components/ui/EmptyState", () => ({ EmptyState: () => null }));

const LIST_ID = "a1b2c3d4-0000-4000-8000-000000000001";

function run(username = "ana", listId = LIST_ID) {
  return UserListDetailPage({ params: Promise.resolve({ username, listId }) });
}

describe("UserListDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    mocks.savedStateFor.mockResolvedValue(new Map());
  });

  it("id no uuid → notFound", async () => {
    await expect(run("ana", "no-uuid")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("lista no visible → notFound", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "ana", username: "ana", displayName: null, relation: "none" });
    mocks.getUserListDetail.mockRejectedValue(new Error("LIST_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("dueño → redirige a /me/lists/[id]", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ id: "ana", username: "ana", displayName: null, relation: "self" });
    await expect(run()).rejects.toThrow(`NEXT_REDIRECT:/es/me/lists/${LIST_ID}`);
  });

  it("lista visible → renderiza el detalle", async () => {
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
  });
});
