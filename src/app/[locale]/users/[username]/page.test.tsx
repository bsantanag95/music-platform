import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import UserProfilePage from "./page";
import { Placa } from "@/components/profiles/Placa";
import { PrivateProfileCard } from "@/components/profiles/PrivateProfileCard";
import { ViewAsBanner } from "@/components/profiles/ViewAsBanner";
import { OwnerEditProvider } from "@/components/profiles/OwnerEditProvider";
import { OwnerProfileBar } from "@/components/profiles/OwnerProfileBar";
import {
  EditablePlaca,
  ExplorationSection,
  FeaturedReviewsSection,
  IdentityCardSection,
  InRotationSection,
  PinnedSection,
  RatingHighlightsSection,
  SettingsCardSection,
} from "./sections";
import type { ProfileView } from "@/services/profiles/profile-view";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

const resolveSession = vi.fn();
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => resolveSession() }));

const getUserPermissions = vi.fn();
vi.mock("@/services/auth/authorization", () => ({
  getUserPermissions: () => getUserPermissions(),
}));

const getProfileView = vi.fn();
vi.mock("@/services/profiles/profile-view", () => ({
  getProfileView: (username: string, viewerId: string | null) => getProfileView(username, viewerId),
}));

const mutualFollowersHint = vi.fn();
const getMutualFollowersPreview = vi.fn();
vi.mock("@/services/profiles/affinity", () => ({
  mutualFollowersHint: (a: string, b: string) => mutualFollowersHint(a, b),
  getMutualFollowersPreview: (username: string, viewerId: string | null) =>
    getMutualFollowersPreview(username, viewerId),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/components/profiles/Placa", () => ({ Placa: () => null }));
vi.mock("@/components/profiles/PrivateProfileCard", () => ({ PrivateProfileCard: () => null }));
vi.mock("@/components/profiles/ViewAsBanner", () => ({ ViewAsBanner: () => null }));
vi.mock("@/components/profiles/OwnerEditProvider", () => ({ OwnerEditProvider: () => null }));
vi.mock("@/components/profiles/OwnerProfileBar", () => ({ OwnerProfileBar: () => null }));
vi.mock("./sections", () => ({
  EditablePlaca: () => null,
  SettingsCardSection: () => null,
  IdentityCardSection: () => null,
  RatingHighlightsSection: () => null,
  FeaturedReviewsSection: () => null,
  InRotationSection: () => null,
  ExplorationSection: () => null,
  PinnedSection: () => null,
  FingerprintSummarySection: () => null,
  RecencySection: () => null,
  AffinitySection: () => null,
  DiaryRail: () => null,
  FavoritesRail: () => null,
  ListsRail: () => null,
  CollectionRail: () => null,
  Level3LinksSection: () => null,
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

// Recorre el árbol en orden y devuelve la secuencia de `type` de los elementos
// cuyo `type` está en `types` — para verificar el orden vertical del perfil.
function orderOf(node: unknown, types: unknown[]): unknown[] {
  const out: unknown[] = [];
  const walk = (n: unknown) => {
    if (n == null || typeof n !== "object") return;
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    const el = n as { type?: unknown; props?: { children?: unknown } };
    if (types.includes(el.type)) out.push(el.type);
    walk(el.props?.children);
  };
  walk(node);
  return out;
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
  getMutualFollowersPreview.mockResolvedValue(null);
  getUserPermissions.mockResolvedValue([]);
});

describe("UserProfilePage", () => {
  it("perfil privado, visitante anónimo: una sola tarjeta privada, sin Placa ni contenido", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));

    const tree = await render();
    const card = findElement(tree, PrivateProfileCard);
    expect(card).not.toBeNull();
    expect(card?.props?.authenticated).toBe(false);
    // La identidad vive en la propia tarjeta: la Placa no se apila encima.
    expect(findElement(tree, Placa)).toBeNull();
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
  });

  it("perfil privado con solicitud pendiente: la tarjeta recibe el perfil con relation 'requested'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "requested", accessible: false }));

    const card = findElement(await render(), PrivateProfileCard);
    expect((card?.props?.profile as ProfileView).relation).toBe("requested");
    expect(card?.props?.authenticated).toBe(true);
  });

  it("perfil privado, visitante común: sin banner de 'cómo te ven'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));

    expect(findElement(await render(), ViewAsBanner)).toBeNull();
  });

  it("dueño con perfil privado y ?preview=1: muestra la tarjeta inerte Y el banner para volver", async () => {
    // Antes la rama privada no montaba el banner: el dueño que probaba "cómo
    // te ven" quedaba sin salida salvo el botón "atrás" del navegador.
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView
      .mockResolvedValueOnce(profile({ relation: "self", isOwner: true, accessible: true }))
      .mockResolvedValueOnce(profile({ relation: "none", accessible: false }));

    const tree = await render("ana", "1");
    expect(getProfileView).toHaveBeenNthCalledWith(2, "ana", null);
    expect(findElement(tree, ViewAsBanner)).not.toBeNull();
    expect(findElement(tree, PrivateProfileCard)?.props?.preview).toBe(true);
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
    expect(findElement(tree, SettingsCardSection)).toBeNull();
  });

  it("perfil accesible: sin umbral", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );
    expect(findElement(await render(), PrivateProfileCard)).toBeNull();
  });

  it("visitante bloqueado por perfil privado: umbral, sin editores", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "blocked", accessible: false }));

    const tree = await render();
    expect(findElement(tree, PrivateProfileCard)).not.toBeNull();
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
  });

  it("vista del dueño: monta el modo edición, la barra, la Placa editable y la tarjeta de Ajustes, sin umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerEditProvider)).not.toBeNull();
    expect(findElement(tree, OwnerProfileBar)?.props?.visibility).toBe("public");
    expect(findElement(tree, OwnerProfileBar)?.props?.username).toBe("ana");
    expect(findElement(tree, SettingsCardSection)).not.toBeNull();
    // La Placa va dentro del bloque editable.
    expect(findElement(findElement(tree, EditablePlaca), Placa)).not.toBeNull();
    // Sin previsualización no hay banner de salida.
    expect(findElement(tree, ViewAsBanner)).toBeNull();
    expect(findElement(tree, PrivateProfileCard)).toBeNull();
    expect(mutualFollowersHint).not.toHaveBeenCalled();
  });

  it("vista del dueño: le pasa isOwn a los bloques editables y al resto de secciones no", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, IdentityCardSection)?.props?.isOwn).toBe(true);
    expect(findElement(tree, PinnedSection)?.props?.isOwn).toBe(true);
    // Los estantes sin editor propio no reciben lápiz (spec: "Bloque sin editor").
    expect(findElement(tree, RatingHighlightsSection)?.props?.isOwn).toBeUndefined();
    expect(findElement(tree, InRotationSection)?.props?.isOwn).toBeUndefined();
  });

  it("dueño con ?preview=1: recompone como anónimo, sin modo edición ni tarjeta de Ajustes", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView
      .mockResolvedValueOnce(profile({ relation: "self", isOwner: true, accessible: true }))
      .mockResolvedValueOnce(
        profile({ profileVisibility: "public", relation: "none", accessible: true }),
      );

    const tree = await render("ana", "1");
    expect(getProfileView).toHaveBeenNthCalledWith(2, "ana", null);
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
    expect(findElement(tree, OwnerProfileBar)).toBeNull();
    expect(findElement(tree, EditablePlaca)).toBeNull();
    expect(findElement(tree, SettingsCardSection)).toBeNull();
    expect(findElement(tree, ViewAsBanner)).not.toBeNull();
    // Las secciones editables tampoco reciben isOwn: el visitante simulado no edita.
    expect(findElement(tree, IdentityCardSection)?.props?.isOwn).toBe(false);
    expect(findElement(tree, PinnedSection)?.props?.isOwn).toBe(false);
  });

  it("visitante que no es el dueño: sin modo edición, sin Ajustes ni banner", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
    expect(findElement(tree, OwnerProfileBar)).toBeNull();
    expect(findElement(tree, EditablePlaca)).toBeNull();
    expect(findElement(tree, SettingsCardSection)).toBeNull();
    expect(findElement(tree, ViewAsBanner)).toBeNull();
    expect(findElement(tree, IdentityCardSection)?.props?.isOwn).toBe(false);
  });

  it("vista pública: layout de dos columnas — Tarjeta de Identidad, destacados generales y valoraciones destacadas", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "following", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, IdentityCardSection)).not.toBeNull();
    expect(findElement(tree, PinnedSection)).not.toBeNull();
    expect(findElement(tree, RatingHighlightsSection)).not.toBeNull();
    expect(findElement(tree, InRotationSection)).not.toBeNull();
    expect(findElement(tree, ExplorationSection)).not.toBeNull();
    expect(findElement(tree, SettingsCardSection)).toBeNull();
  });

  it("vista del dueño: monta la misma composición que la vista pública (spec social-profiles, 'Composición visual única')", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, IdentityCardSection)).not.toBeNull();
    expect(findElement(tree, RatingHighlightsSection)).not.toBeNull();
    expect(findElement(tree, FeaturedReviewsSection)).not.toBeNull();
    expect(findElement(tree, InRotationSection)).not.toBeNull();
    expect(findElement(tree, ExplorationSection)).not.toBeNull();
    // Las capas del dueño se superponen a la misma estructura, no la reemplazan.
    expect(findElement(tree, OwnerEditProvider)).not.toBeNull();
  });

  it("vista del dueño: 'Reseñas' va después de los destacados y antes de 'En rotación'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(
      orderOf(tree, [PinnedSection, FeaturedReviewsSection, InRotationSection]),
    ).toEqual([PinnedSection, FeaturedReviewsSection, InRotationSection]);
  });

  it("vista pública: 'Reseñas' va después de los destacados y antes de 'En rotación'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "following", accessible: true, profileVisibility: "public" }),
    );

    const tree = await render();
    expect(
      orderOf(tree, [PinnedSection, FeaturedReviewsSection, InRotationSection]),
    ).toEqual([PinnedSection, FeaturedReviewsSection, InRotationSection]);
  });

  it("Tarjeta de Identidad va antes de Empieza por aquí, que abre el Nivel 2 antes de Valoraciones destacadas", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "following", accessible: true }),
    );

    const tree = await render();
    expect(orderOf(tree, [IdentityCardSection, PinnedSection, RatingHighlightsSection])).toEqual([
      IdentityCardSection,
      PinnedSection,
      RatingHighlightsSection,
    ]);
  });

  it("visitante autenticado bloqueado fuera: calcula el hint y lo pasa al umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));
    mutualFollowersHint.mockResolvedValue(2);

    const tree = await render();
    expect(mutualFollowersHint).toHaveBeenCalledWith("viewer", "owner");
    expect(findElement(tree, PrivateProfileCard)?.props?.mutualFollowers).toBe(2);
  });
});
