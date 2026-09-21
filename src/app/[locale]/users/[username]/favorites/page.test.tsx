import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileFavoritesPage from "./page";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";
vi.mock("@/services/profiles/renamed-redirect", () => ({ redirectIfRenamed: vi.fn().mockResolvedValue(undefined) }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  getProfileByUsername: vi.fn(),
  listUserFavorites: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/favorites/favorites", () => ({
  listUserFavorites: (...a: unknown[]) => mocks.listUserFavorites(...a),
}));
vi.mock("@/components/favorites/FavoritesWall", () => ({
  FavoritesWall: ({ initial }: { initial: { favorites: unknown[] } }) => (
    <div data-testid="wall">{initial.favorites.length}</div>
  ),
}));

const accessibleProfile = {
  id: "owner",
  username: "ana",
  displayName: "Ana",
  profileVisibility: "public",
  relation: "none",
  blockedByMe: false,
  accessible: true,
};

function run(username = "ana") {
  return ProfileFavoritesPage({ params: Promise.resolve({ username }) });
}

describe("ProfileFavoritesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue(null);
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil inexistente: antes de notFound consulta si es el usuario anterior de alguien", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run("besantanag95")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(redirectIfRenamed).toHaveBeenCalledWith("besantanag95", "/favorites");
  });

  it("perfil accesible: pide página 1 de hasta 20 y renderiza el muro completo", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listUserFavorites.mockResolvedValue({
      favorites: [{ id: "f1" }, { id: "f2" }],
      page: 1,
      pageSize: 20,
      hasNext: false,
      counts: { artist: 1, "release-group": 1, recording: 0 },
    });

    const { findByTestId } = render(await run());
    expect((await findByTestId("wall")).textContent).toBe("2");
    expect(mocks.listUserFavorites).toHaveBeenCalledWith("ana", null, 1, 20);
  });

  it("perfil no accesible: no consulta favoritos, muestra el aviso de perfil privado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId, findByText } = render(await run());
    expect(await findByText("connections.privateNotice")).toBeInTheDocument();
    expect(queryByTestId("wall")).toBeNull();
    expect(mocks.listUserFavorites).not.toHaveBeenCalled();
  });
});
