import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import UserProfilePage from "./page";
import { Placa } from "@/components/profiles/Placa";
import { PrivateThreshold } from "@/components/profiles/PrivateThreshold";
import { ViewAsBanner } from "@/components/profiles/ViewAsBanner";
import {
  AlbumFavoritesSection,
  AnthemSection,
  HubSection,
  InRotationSection,
  OwnerEditors,
  PinnedSection,
  ShowcaseSection,
} from "./sections";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const resolveSession = vi.fn();
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => resolveSession() }));

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
vi.mock("@/components/profiles/ViewAsBanner", () => ({ ViewAsBanner: () => null }));
vi.mock("./sections", () => ({
  OwnerEditors: () => null,
  HubSection: () => null,
  ShowcaseSection: () => null,
  AlbumFavoritesSection: () => null,
  InRotationSection: () => null,
  PinnedSection: () => null,
  AnthemSection: () => null,
  FingerprintSection: () => null,
  RecencySection: () => null,
  AffinitySection: () => null,
  DiaryRail: () => null,
  FavoritesRail: () => null,
  ListsRail: () => null,
  CollectionRail: () => null,
}));

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

const render = (username = "ana", preview?: string) =>
  UserProfilePage({
    params: Promise.resolve({ username }),
    searchParams: Promise.resolve(preview ? { preview } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  mutualFollowersHint.mockResolvedValue(0);
});

describe("UserProfilePage", () => {
  it("perfil privado, visitante anónimo: umbral privado, sin contenido", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));

    const tree = await render();
    expect(findElement(tree, Placa)).not.toBeNull();
    expect(findElement(tree, PrivateThreshold)).not.toBeNull();
    expect(findElement(tree, OwnerEditors)).toBeNull();
  });

  it("perfil privado con solicitud pendiente: umbral con relation 'requested'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "requested", accessible: false }));

    const threshold = findElement(await render(), PrivateThreshold);
    expect(threshold?.props?.relation).toBe("requested");
  });

  it("perfil accesible: sin umbral", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );
    expect(findElement(await render(), PrivateThreshold)).toBeNull();
  });

  it("visitante bloqueado por perfil privado: umbral, sin editores", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "blocked", accessible: false }));

    const tree = await render();
    expect(findElement(tree, PrivateThreshold)).not.toBeNull();
    expect(findElement(tree, OwnerEditors)).toBeNull();
  });

  it("vista del dueño: monta OwnerEditors, HubSection y ViewAsBanner, sin umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerEditors)).not.toBeNull();
    expect(findElement(tree, HubSection)).not.toBeNull();
    const banner = findElement(tree, ViewAsBanner);
    expect(banner?.props?.previewing).toBe(false);
    expect(findElement(tree, PrivateThreshold)).toBeNull();
    expect(mutualFollowersHint).not.toHaveBeenCalled();
  });

  it("dueño con ?preview=1: recompone como anónimo, sin editores ni hub", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView
      .mockResolvedValueOnce(profile({ relation: "self", isOwner: true, accessible: true }))
      .mockResolvedValueOnce(
        profile({ profileVisibility: "public", relation: "none", accessible: true }),
      );

    const tree = await render("ana", "1");
    expect(getProfileView).toHaveBeenNthCalledWith(2, "ana", null);
    expect(findElement(tree, OwnerEditors)).toBeNull();
    expect(findElement(tree, HubSection)).toBeNull();
    expect(findElement(tree, ViewAsBanner)?.props?.previewing).toBe(true);
  });

  it("visitante que no es el dueño: sin hub ni banner", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, HubSection)).toBeNull();
    expect(findElement(tree, ViewAsBanner)).toBeNull();
  });

  it("vista pública: layout de dos columnas — himno y destacados por separado, sin ShowcaseSection", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "following", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, AnthemSection)).not.toBeNull();
    expect(findElement(tree, PinnedSection)).not.toBeNull();
    expect(findElement(tree, AlbumFavoritesSection)).not.toBeNull();
    expect(findElement(tree, InRotationSection)).not.toBeNull();
    expect(findElement(tree, ShowcaseSection)).toBeNull();
    expect(findElement(tree, HubSection)).toBeNull();
  });

  it("vista del dueño: monta AlbumFavoritesSection, InRotationSection y ShowcaseSection", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, AlbumFavoritesSection)).not.toBeNull();
    expect(findElement(tree, InRotationSection)).not.toBeNull();
    expect(findElement(tree, ShowcaseSection)).not.toBeNull();
  });

  it("visitante autenticado bloqueado fuera: calcula el hint y lo pasa al umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));
    mutualFollowersHint.mockResolvedValue(2);

    const tree = await render();
    expect(mutualFollowersHint).toHaveBeenCalledWith("viewer", "owner");
    expect(findElement(tree, PrivateThreshold)?.props?.mutualFollowers).toBe(2);
  });
});
