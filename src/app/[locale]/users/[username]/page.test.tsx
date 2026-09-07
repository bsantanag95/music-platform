import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import UserProfilePage from "./page";
import { Placa } from "@/components/profiles/Placa";
import { PrivateThreshold } from "@/components/profiles/PrivateThreshold";
import { OwnerIdentityEditor } from "@/components/profiles/OwnerIdentityEditor";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const resolveSession = vi.fn();
vi.mock("@/services/auth/sessions", () => ({
  resolveSession: () => resolveSession(),
}));

const getProfileView = vi.fn();
vi.mock("@/services/profiles/profile-view", () => ({
  getProfileView: (username: string, viewerId: string | null) => getProfileView(username, viewerId),
}));

const mutualFollowersHint = vi.fn();
vi.mock("@/services/profiles/affinity", () => ({
  mutualFollowersHint: (a: string, b: string) => mutualFollowersHint(a, b),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/profiles/Placa", () => ({ Placa: () => null }));
vi.mock("@/components/profiles/PrivateThreshold", () => ({ PrivateThreshold: () => null }));
vi.mock("@/components/profiles/OwnerIdentityEditor", () => ({
  OwnerIdentityEditor: () => null,
}));
vi.mock("@/components/profiles/OwnerLinksEditor", () => ({ OwnerLinksEditor: () => null }));
vi.mock("@/components/diary/DiaryList", () => ({ DiaryList: () => null }));
vi.mock("@/components/favorites/FavoritesWall", () => ({ FavoritesWall: () => null }));
vi.mock("@/components/lists/ListsList", () => ({ ListsList: () => null }));
vi.mock("@/components/collection/CollectionShelf", () => ({ CollectionShelf: () => null }));
vi.mock("@/services/diary/diary", () => ({ listUserDiary: vi.fn().mockResolvedValue({ entries: [] }) }));
vi.mock("@/services/favorites/favorites", () => ({ listUserFavorites: vi.fn().mockResolvedValue({}) }));
vi.mock("@/services/lists/lists", () => ({ listUserLists: vi.fn().mockResolvedValue({}) }));
vi.mock("@/services/collection/collection", () => ({ listProfileCollection: vi.fn().mockResolvedValue({}) }));

function findElement(node: unknown, type: unknown): { props?: Record<string, unknown> } | null {
  if (node == null || typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, type);
      if (found) return found;
    }
    return null;
  }
  const element = node as { type?: unknown; props?: { children?: unknown } };
  if (element.type === type) return element as { props?: Record<string, unknown> };
  return findElement((element.props as { children?: ReactNode } | undefined)?.children, type);
}

const profile = (over: Partial<ProfileView>): ProfileView => ({
  id: "owner",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "private",
  bio: null,
  pronouns: null,
  location: null,
  timezone: null,
  avatarUrl: null,
  memberSince: new Date("2025-01-01T00:00:00Z"),
  links: [],
  followerCount: 0,
  followingCount: 0,
  relation: "none",
  accessible: false,
  blockedByMe: false,
  isOwner: false,
  ...over,
});

const render = (username = "ana") =>
  UserProfilePage({ params: Promise.resolve({ username }) });

beforeEach(() => {
  vi.clearAllMocks();
  mutualFollowersHint.mockResolvedValue(0);
});

describe("UserProfilePage", () => {
  it("perfil privado, visitante anónimo: umbral privado, sin estantes", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));

    const tree = await render();
    expect(findElement(tree, PrivateThreshold)).not.toBeNull();
    expect(findElement(tree, Placa)).not.toBeNull();
    // Ningún <section> de estante (diario/favoritos/listas/colección).
    expect(JSON.stringify(tree)).not.toContain("diaryTitle");
  });

  it("perfil privado con solicitud pendiente: umbral con relation 'requested'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "requested", accessible: false }));

    const tree = await render();
    const threshold = findElement(tree, PrivateThreshold);
    expect(threshold?.props?.relation).toBe("requested");
  });

  it("perfil accesible (público mínimo): estantes, sin umbral", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, PrivateThreshold)).toBeNull();
    expect(JSON.stringify(tree)).toContain("diaryTitle");
  });

  it("visitante bloqueado por perfil privado: umbral, sin estantes", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "blocked", accessible: false }));

    const tree = await render();
    expect(findElement(tree, PrivateThreshold)).not.toBeNull();
    expect(JSON.stringify(tree)).not.toContain("diaryTitle");
  });

  it("vista del dueño: monta los editores de identidad, sin umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true, profileVisibility: "private" }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerIdentityEditor)).not.toBeNull();
    expect(findElement(tree, PrivateThreshold)).toBeNull();
    expect(mutualFollowersHint).not.toHaveBeenCalled();
  });

  it("visitante que no es el dueño: sin editores de identidad", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerIdentityEditor)).toBeNull();
  });

  it("el hint de seguidores en común solo se calcula si el visitante está autenticado y bloqueado fuera", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));
    mutualFollowersHint.mockResolvedValue(2);

    const tree = await render();
    expect(mutualFollowersHint).toHaveBeenCalledWith("viewer", "owner");
    expect(findElement(tree, PrivateThreshold)?.props?.mutualFollowers).toBe(2);
  });
});
