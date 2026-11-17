import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import UserProfilePage from "./page";
import { ProfileHeader } from "@/components/profiles/ProfileHeader";
import { PrivateProfileDoor } from "@/components/profiles/PrivateProfileDoor";
import { ViewAsBanner } from "@/components/profiles/ViewAsBanner";
import { OwnerEditProvider } from "@/components/profiles/OwnerEditProvider";
import { OwnerHeaderActions } from "@/components/profiles/OwnerHeaderActions";
import {
  AnchorsSection,
  EditablePlaca,
  FavoritesRail,
  ConcertsRail,
  ListsCollectionRow,
  ReviewsDiaryRow,
  HeaderBackdropSection,
  IdentityCardSection,
  IdentityStripSection,
  InRotationSection,
  StartRow,
  OwnerRequestsSection,
  FollowersNoteSection,
} from "./sections";
import type { ProfileView } from "@/services/profiles/profile-view";
// Compartir (add-share-foundation): carga datos de la base; acá no se prueba.
vi.mock("@/components/share/ShareAction", () => ({ ShareAction: () => null }));
// Tono del perfil (redesign-user-profile-phase3): guardado, se lee al componer.
const getProfileTone = vi.fn();
vi.mock("@/services/profiles/showcase", () => ({ getProfileTone: (id: string) => getProfileTone(id) }));
vi.mock("@/services/share/metadata", () => ({ buildShareMetadata: async () => ({}), buildProfileShareMetadata: async () => ({}) }));
vi.mock("@/services/profiles/renamed-redirect", () => ({ redirectIfRenamed: vi.fn().mockResolvedValue(undefined) }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
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
vi.mock("@/components/profiles/ProfileHeader", () => ({ ProfileHeader: () => null }));
vi.mock("@/components/profiles/PrivateProfileDoor", () => ({ PrivateProfileDoor: () => null }));
vi.mock("@/components/profiles/ViewAsBanner", () => ({ ViewAsBanner: () => null }));
vi.mock("@/components/profiles/OwnerEditProvider", () => ({ OwnerEditProvider: () => null }));
vi.mock("@/components/profiles/OwnerHeaderActions", () => ({ OwnerHeaderActions: () => null }));
vi.mock("./sections", () => ({
  EditablePlaca: () => null,
  OwnerRequestsSection: () => null,
  IdentityCardSection: () => null,
  StartRow: () => null,
  ReviewsDiaryRow: () => null,
  ListsCollectionRow: () => null,
  InRotationSection: () => null,
  IdentityStripSection: () => null,
  HeaderBackdropSection: () => null,
  AnchorsSection: () => null,
  RecencySection: () => null,
  AffinitySection: () => null,
  FavoritesRail: () => null,
  ConcertsRail: () => null,
  FollowersNoteSection: () => null,
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
  const element = node as { type?: unknown; props?: Record<string, unknown> };
  if (element.type === type) return element as { props?: Record<string, unknown> };
  for (const value of Object.values(element.props ?? {})) {
    const found = findElement(value, type);
    if (found) return found;
  }
  return null;
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
    const el = n as { type?: unknown; props?: Record<string, unknown> };
    if (types.includes(el.type)) out.push(el.type);
    Object.values(el.props ?? {}).forEach(walk);
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
  pronounSet: null,
  country: null,
  location: null,
  timezone: null,
  showLocalTime: false,
  selfRoles: [],
  genres: [],
  listeningFormats: [],
  prompts: [],
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
  getProfileTone.mockResolvedValue(null);
});

describe("UserProfilePage", () => {
  it("perfil privado, visitante anónimo: cabecera sin acceso + franja, sin identidad ni contenido", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));

    const tree = await render();
    const door = findElement(tree, PrivateProfileDoor);
    expect(door).not.toBeNull();
    expect(door?.props?.authenticated).toBe(false);
    // La misma cabecera del perfil, en su variante sin acceso y sin Tarjeta de Identidad ni fondo.
    const header = findElement(tree, ProfileHeader);
    expect(header?.props?.locked).toEqual({ state: "anonymous" });
    expect(header?.props?.identity).toBeUndefined();
    expect(header?.props?.backdrop).toBeUndefined();
    expect(header?.props?.share).toBeDefined();
    expect(findElement(tree, AnchorsSection)).toBeNull();
    expect(findElement(tree, IdentityStripSection)).toBeNull();
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
  });

  it("perfil privado con solicitud pendiente: la tarjeta recibe el perfil con relation 'requested'", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "requested", accessible: false }));

    const tree = await render();
    const card = findElement(tree, PrivateProfileDoor);
    expect((card?.props?.profile as ProfileView).relation).toBe("requested");
    expect(card?.props?.authenticated).toBe(true);
    expect(findElement(tree, ProfileHeader)?.props?.locked).toEqual({ state: "requested" });
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
    expect(findElement(tree, PrivateProfileDoor)?.props?.preview).toBe(true);
    expect(findElement(tree, ProfileHeader)?.props?.locked).toEqual({ state: "preview" });
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
    expect(findElement(tree, OwnerRequestsSection)).toBeNull();
  });

  it("perfil accesible: sin umbral", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );
    expect(findElement(await render(), PrivateProfileDoor)).toBeNull();
  });

  it("visitante bloqueado por perfil privado: umbral, sin editores", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "blocked", accessible: false }));

    const tree = await render();
    expect(findElement(tree, PrivateProfileDoor)).not.toBeNull();
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
    // Quien fue bloqueado por la cuenta no recibe la acción de compartir.
    expect(findElement(tree, ProfileHeader)?.props?.locked).toEqual({ state: "blockedByThem" });
    expect(findElement(tree, ProfileHeader)?.props?.share).toBeUndefined();
  });

  it("vista del dueño: monta el modo edición, sus acciones en la cabecera, la cabecera editable y las solicitudes, sin umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerEditProvider)).not.toBeNull();
    // Acciones y marca de visibilidad del dueño en la cabecera, sin barra aparte.
    const header = findElement(tree, ProfileHeader);
    expect(header?.props?.ownerStatus).toEqual({ visibility: "public" });
    expect(findElement(header?.props?.ownerActions, OwnerHeaderActions)?.props?.username).toBe("ana");
    expect(findElement(tree, OwnerRequestsSection)).not.toBeNull();
    // Los datos de la persona de la cabecera van dentro del bloque editable.
    const wrapDetails = findElement(tree, ProfileHeader)?.props?.wrapDetails as (details: ReactNode) => ReactNode;
    expect(findElement(wrapDetails(<p />), EditablePlaca)).not.toBeNull();
    // Sin previsualización no hay banner de salida.
    expect(findElement(tree, ViewAsBanner)).toBeNull();
    expect(findElement(tree, PrivateProfileDoor)).toBeNull();
    expect(mutualFollowersHint).not.toHaveBeenCalled();
  });

  it("vista del dueño: le pasa isOwn a los bloques editables y al resto de secciones no", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, IdentityCardSection)?.props?.isOwn).toBe(true);
    expect(findElement(tree, StartRow)?.props?.isOwn).toBe(true);
    // Los estantes sin editor propio no reciben lápiz (spec: "Bloque sin editor").
    expect(findElement(tree, ListsCollectionRow)?.props?.canAct).toBe(false);
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
    expect(findElement(tree, ProfileHeader)?.props?.ownerActions).toBeUndefined();
    expect(findElement(tree, ProfileHeader)?.props?.ownerStatus).toBeUndefined();
    expect(findElement(tree, ProfileHeader)?.props?.wrapDetails).toBeUndefined();
    expect(findElement(tree, OwnerRequestsSection)).toBeNull();
    expect(findElement(tree, ViewAsBanner)).not.toBeNull();
    // Las secciones editables tampoco reciben isOwn: el visitante simulado no edita.
    expect(findElement(tree, IdentityCardSection)?.props?.isOwn).toBe(false);
    expect(findElement(tree, StartRow)?.props?.isOwn).toBe(false);
  });

  it("visitante que no es el dueño: sin modo edición, acciones del dueño, solicitudes ni banner", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "none", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, OwnerEditProvider)).toBeNull();
    expect(findElement(tree, ProfileHeader)?.props?.ownerActions).toBeUndefined();
    expect(findElement(tree, ProfileHeader)?.props?.ownerStatus).toBeUndefined();
    expect(findElement(tree, ProfileHeader)?.props?.wrapDetails).toBeUndefined();
    expect(findElement(tree, OwnerRequestsSection)).toBeNull();
    expect(findElement(tree, ViewAsBanner)).toBeNull();
    expect(findElement(tree, IdentityCardSection)?.props?.isOwn).toBe(false);
  });

  it("vista pública: cabecera con la Tarjeta de Identidad, anclas, franja, destacados y valoraciones destacadas", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(
      profile({ profileVisibility: "public", relation: "following", accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, IdentityCardSection)).not.toBeNull();
    // La Tarjeta de Identidad y el fondo viajan dentro de la cabecera.
    expect(findElement(findElement(tree, ProfileHeader)?.props?.identity, IdentityCardSection)).not.toBeNull();
    expect(findElement(findElement(tree, ProfileHeader)?.props?.backdrop, HeaderBackdropSection)).not.toBeNull();
    expect(findElement(tree, AnchorsSection)).not.toBeNull();
    expect(findElement(tree, StartRow)).not.toBeNull();
    expect(findElement(tree, InRotationSection)).not.toBeNull();
    expect(findElement(tree, IdentityStripSection)).not.toBeNull();
    expect(findElement(tree, OwnerRequestsSection)).toBeNull();
  });

  it("vista del dueño: monta la misma composición que la vista pública (spec social-profiles, 'Composición visual única')", async () => {
    resolveSession.mockResolvedValue({ user: { id: "owner" } });
    getProfileView.mockResolvedValue(
      profile({ relation: "self", isOwner: true, accessible: true }),
    );

    const tree = await render();
    expect(findElement(tree, IdentityCardSection)).not.toBeNull();
    expect(findElement(tree, ReviewsDiaryRow)).not.toBeNull();
    expect(findElement(tree, InRotationSection)).not.toBeNull();
    expect(findElement(tree, IdentityStripSection)).not.toBeNull();
    // Las capas del dueño se superponen a la misma estructura, no la reemplazan.
    expect(findElement(tree, OwnerEditProvider)).not.toBeNull();
  });

  it("visitante autenticado bloqueado fuera: calcula el hint y lo pasa al umbral", async () => {
    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    getProfileView.mockResolvedValue(profile({ relation: "none", accessible: false }));
    mutualFollowersHint.mockResolvedValue(2);

    const tree = await render();
    expect(mutualFollowersHint).toHaveBeenCalledWith("viewer", "owner");
    expect(findElement(tree, PrivateProfileDoor)?.props?.mutualFollowers).toBe(2);
  });

  it("la franja de identidad va después de la cabecera y antes de Empieza por aquí", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ profileVisibility: "public", relation: "none", accessible: true }));

    const tree = await render();
    expect(orderOf(tree, [ProfileHeader, AnchorsSection, IdentityStripSection, StartRow])).toEqual([
      ProfileHeader,
      AnchorsSection,
      IdentityStripSection,
      StartRow,
    ]);
  });

  it("Nivel 2 en filas: En rotación, Empieza | Valoraciones, Reseñas | Diario, Favoritos, Listas | Colección, Conciertos", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ profileVisibility: "public", relation: "none", accessible: true }));

    const tree = await render();
    const order = [IdentityStripSection, InRotationSection, StartRow, ReviewsDiaryRow, FavoritesRail, ListsCollectionRow, ConcertsRail];
    expect(orderOf(tree, order)).toEqual(order);
  });

  it("solo un visitante con sesión que no es el dueño puede guardar o seguir listas", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ profileVisibility: "public", relation: "none", accessible: true }));
    expect(findElement(await render(), ListsCollectionRow)?.props?.canAct).toBe(false);

    resolveSession.mockResolvedValue({ user: { id: "viewer" } });
    expect(findElement(await render(), ListsCollectionRow)?.props?.canAct).toBe(true);
  });

  it("pone el tono guardado del perfil en --profile-tone; sin tono, nada (ámbar por defecto)", async () => {
    resolveSession.mockResolvedValue(null);
    getProfileView.mockResolvedValue(profile({ profileVisibility: "public", relation: "none", accessible: true }));

    getProfileTone.mockResolvedValueOnce("#e0606a");
    const toned = (await render()) as { props: { style?: Record<string, string> } };
    expect(getProfileTone).toHaveBeenCalledWith("owner");
    expect(toned.props.style).toEqual({ "--profile-tone": "#e0606a" });

    const plain = (await render()) as { props: { style?: Record<string, string> } };
    expect(plain.props.style).toBeUndefined();
  });

  describe("aviso para quien no sigue (redesign-private-profile-phase2)", () => {
    it("visitante anónimo de un perfil público: monta el aviso con su vista", async () => {
      resolveSession.mockResolvedValue(null);
      getProfileView.mockResolvedValue(profile({ profileVisibility: "public", relation: "none", accessible: true }));
      const note = findElement(await render(), FollowersNoteSection);
      expect(note?.props?.viewerId).toBeNull();
      expect(note?.props?.authenticated).toBe(false);
      expect(note?.props?.preview).toBe(false);
    });

    it("con sesión, sin relación: lo monta", async () => {
      resolveSession.mockResolvedValue({ user: { id: "viewer" } });
      getProfileView.mockResolvedValue(profile({ profileVisibility: "public", relation: "none", accessible: true }));
      expect(findElement(await render(), FollowersNoteSection)?.props?.viewerId).toBe("viewer");
    });

    it("previsualización del dueño: lo monta, inerte", async () => {
      resolveSession.mockResolvedValue({ user: { id: "owner" } });
      getProfileView
        .mockResolvedValueOnce(profile({ relation: "self", isOwner: true, accessible: true }))
        .mockResolvedValueOnce(profile({ profileVisibility: "public", relation: "none", accessible: true }));
      expect(findElement(await render("ana", "1"), FollowersNoteSection)?.props?.preview).toBe(true);
    });

    it("seguidor: no lo monta", async () => {
      resolveSession.mockResolvedValue({ user: { id: "viewer" } });
      getProfileView.mockResolvedValue(
        profile({ profileVisibility: "public", relation: "following", accessible: true }),
      );
      expect(findElement(await render(), FollowersNoteSection)).toBeNull();
    });

    it("dueño: no lo monta", async () => {
      resolveSession.mockResolvedValue({ user: { id: "owner" } });
      getProfileView.mockResolvedValue(profile({ relation: "self", isOwner: true, accessible: true }));
      expect(findElement(await render(), FollowersNoteSection)).toBeNull();
    });
  });
});
