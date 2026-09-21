import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileArtistsPage from "./page";
vi.mock("@/services/profiles/renamed-redirect", () => ({ redirectIfRenamed: vi.fn().mockResolvedValue(undefined) }));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${vars.name}` : key,
  ),
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
  listProfileFollowedArtists: vi.fn(),
  getProfileAffinity: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/profiles/exploration", () => ({
  listProfileFollowedArtists: (...a: unknown[]) => mocks.listProfileFollowedArtists(...a),
}));
vi.mock("@/services/profiles/affinity", () => ({
  getProfileAffinity: (...a: unknown[]) => mocks.getProfileAffinity(...a),
}));
vi.mock("@/components/profiles/ArtistTile", () => ({
  ArtistTile: ({ artist }: { artist: { id: string; name: string } }) => <div data-testid="tile">{artist.name}</div>,
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
  return ProfileArtistsPage({ params: Promise.resolve({ username }) });
}

describe("ProfileArtistsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue(null);
    mocks.getProfileAffinity.mockResolvedValue(null);
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil accesible: pide página 1 de hasta 50 y renderiza una celda por artista", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listProfileFollowedArtists.mockResolvedValue({
      artists: [{ id: "a1", name: "Radiohead" }, { id: "a2", name: "Boygenius" }],
      totalCount: 2,
      page: 1,
      pageSize: 50,
      hasNext: false,
    });

    const { findAllByTestId } = render(await run());
    expect(await findAllByTestId("tile")).toHaveLength(2);
    expect(mocks.listProfileFollowedArtists).toHaveBeenCalledWith("ana", null, 1, 50);
  });

  it("perfil no accesible: no consulta artistas, muestra aviso", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId, findByText } = render(await run());
    expect(await findByText("connections.privateNotice")).toBeInTheDocument();
    expect(queryByTestId("tile")).toBeNull();
    expect(mocks.listProfileFollowedArtists).not.toHaveBeenCalled();
  });

  it("sin artistas: muestra el mensaje vacío", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listProfileFollowedArtists.mockResolvedValue({ artists: [], totalCount: 0, page: 1, pageSize: 50, hasNext: false });

    const { findByText } = render(await run());
    expect(await findByText("explorationFullEmpty")).toBeInTheDocument();
  });
});
