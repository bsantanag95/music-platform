import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileCollectionPage from "./page";
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
  listProfileCollection: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/collection/collection", () => ({
  listProfileCollection: (...a: unknown[]) => mocks.listProfileCollection(...a),
}));
vi.mock("@/components/collection/CollectionShelf", () => ({
  CollectionShelf: ({
    initial,
    username,
    readOnly,
    initialFilters,
  }: {
    initial: { entries: unknown[] };
    username: string;
    readOnly?: boolean;
    initialFilters?: Record<string, unknown>;
  }) => (
    <div
      data-testid="shelf"
      data-username={username}
      data-readonly={readOnly ? "true" : "false"}
      data-filters={JSON.stringify(initialFilters)}
    >
      {initial.entries.length}
    </div>
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

function run(searchParams: Record<string, string | string[] | undefined> = {}, username = "ana") {
  return ProfileCollectionPage({
    params: Promise.resolve({ username }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("ProfileCollectionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listProfileCollection.mockResolvedValue({
      entries: [{ id: "e1" }, { id: "e2" }],
      page: 1,
      pageSize: 20,
      hasNext: false,
      counts: { vinyl: 2, cd: 0, cassette: 0, other: 0 },
    });
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil accesible: pide la página 1 de 20 y renderiza la colección en modo lectura", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);

    const { findByTestId } = render(await run());
    const shelf = await findByTestId("shelf");
    expect(shelf.textContent).toBe("2");
    expect(shelf).toHaveAttribute("data-username", "ana");
    expect(shelf).toHaveAttribute("data-readonly", "true");
    expect(mocks.listProfileCollection).toHaveBeenCalledWith("ana", null, 1, 20, {});
  });

  it("los filtros de la URL (el 'Ver los N' de un artista) llegan a la consulta y al componente", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);

    const { findByTestId } = render(await run({ q: "Queen", format: "vinyl" }));
    const shelf = await findByTestId("shelf");
    expect(mocks.listProfileCollection).toHaveBeenCalledWith("ana", null, 1, 20, {
      q: "Queen",
      format: "vinyl",
    });
    expect(JSON.parse(shelf.getAttribute("data-filters")!)).toEqual({ q: "Queen", format: "vinyl" });
  });

  it("un filtro inválido en la URL se ignora en vez de romper la página", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);

    const { findByTestId } = render(await run({ sort: "nope", q: "Queen" }));
    await findByTestId("shelf");
    expect(mocks.listProfileCollection).toHaveBeenCalledWith("ana", null, 1, 20, {});
  });

  it("perfil no accesible: no consulta la colección, muestra el aviso de perfil privado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId, findByText } = render(await run());
    expect(await findByText("connections.privateNotice")).toBeInTheDocument();
    expect(queryByTestId("shelf")).toBeNull();
    expect(mocks.listProfileCollection).not.toHaveBeenCalled();
  });
});
