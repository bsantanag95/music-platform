import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileCaminosPage from "./page";
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
  listVisibleCaminos: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/camino/camino", () => ({
  listVisibleCaminos: (...a: unknown[]) => mocks.listVisibleCaminos(...a),
}));
vi.mock("@/components/camino/CaminoProfileCard", () => ({
  CaminoProfileCard: ({ camino, canTrack }: { camino: { id: string }; canTrack: boolean }) => (
    <div data-testid="card" data-id={camino.id} data-cantrack={canTrack ? "true" : "false"} />
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

function run(username = "ana", searchParams: { page?: string } = {}) {
  return ProfileCaminosPage({
    params: Promise.resolve({ username }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("ProfileCaminosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue(null);
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil accesible: pide la página 1 de 20 y renderiza las tarjetas", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listVisibleCaminos.mockResolvedValue({
      caminos: [{ id: "c1" }, { id: "c2" }],
      page: 1,
      pageSize: 20,
      totalCount: 2,
    });

    const { findAllByTestId } = render(await run());
    const cards = await findAllByTestId("card");
    expect(cards).toHaveLength(2);
    expect(mocks.listVisibleCaminos).toHaveBeenCalledWith("ana", null, 1, 20);
  });

  it("sin sesión, las tarjetas no ofrecen tracking", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listVisibleCaminos.mockResolvedValue({
      caminos: [{ id: "c1" }],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });

    const { findByTestId } = render(await run());
    const card = await findByTestId("card");
    expect(card).toHaveAttribute("data-cantrack", "false");
  });

  it("el propio dueño no puede trackear sus Caminos", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "owner" } });
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, relation: "self" });
    mocks.listVisibleCaminos.mockResolvedValue({
      caminos: [{ id: "c1" }],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });

    const { findByTestId } = render(await run());
    const card = await findByTestId("card");
    expect(card).toHaveAttribute("data-cantrack", "false");
  });

  it("perfil no accesible: no consulta Caminos, muestra el aviso de perfil privado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId, findByText } = render(await run());
    expect(await findByText("connections.privateNotice")).toBeInTheDocument();
    expect(queryByTestId("card")).toBeNull();
    expect(mocks.listVisibleCaminos).not.toHaveBeenCalled();
  });

  it("sin Caminos visibles, muestra el estado vacío", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listVisibleCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 20, totalCount: 0 });

    const { queryByTestId, findByText } = render(await run());
    expect(await findByText("profileEmpty")).toBeInTheDocument();
    expect(queryByTestId("card")).toBeNull();
  });

  it("respeta el parámetro page de la URL", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listVisibleCaminos.mockResolvedValue({ caminos: [], page: 2, pageSize: 20, totalCount: 0 });
    await run("ana", { page: "2" });
    expect(mocks.listVisibleCaminos).toHaveBeenCalledWith("ana", null, 2, 20);
  });
});
