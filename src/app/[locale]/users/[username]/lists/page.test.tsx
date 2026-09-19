import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import ProfileListsPage from "./page";

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
  listUserLists: vi.fn(),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: () => mocks.resolveSession() }));
vi.mock("@/services/social/profiles", () => ({
  getProfileByUsername: (...a: unknown[]) => mocks.getProfileByUsername(...a),
}));
vi.mock("@/services/lists/lists", () => ({
  listUserLists: (...a: unknown[]) => mocks.listUserLists(...a),
}));
vi.mock("@/components/lists/ListsList", () => ({
  ListsList: ({ initial, username }: { initial: { lists: unknown[] }; username: string }) => (
    <div data-testid="list" data-username={username}>
      {initial.lists.length}
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

function run(username = "ana") {
  return ProfileListsPage({ params: Promise.resolve({ username }) });
}

describe("ProfileListsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveSession.mockResolvedValue(null);
  });

  it("perfil inexistente → notFound", async () => {
    mocks.getProfileByUsername.mockRejectedValue(new Error("USER_NOT_FOUND"));
    await expect(run()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("perfil accesible: pide la página 1 de 20 y renderiza el listado del dueño", async () => {
    mocks.getProfileByUsername.mockResolvedValue(accessibleProfile);
    mocks.listUserLists.mockResolvedValue({
      lists: [{ id: "l1" }, { id: "l2" }],
      page: 1,
      pageSize: 20,
      hasNext: false,
      totalCount: 2,
    });

    const { findByTestId } = render(await run());
    const list = await findByTestId("list");
    expect(list.textContent).toBe("2");
    expect(list).toHaveAttribute("data-username", "ana");
    expect(mocks.listUserLists).toHaveBeenCalledWith("ana", null, 1, 20);
  });

  it("perfil no accesible: no consulta las listas, muestra el aviso de perfil privado", async () => {
    mocks.getProfileByUsername.mockResolvedValue({ ...accessibleProfile, accessible: false });

    const { queryByTestId, findByText } = render(await run());
    expect(await findByText("connections.privateNotice")).toBeInTheDocument();
    expect(queryByTestId("list")).toBeNull();
    expect(mocks.listUserLists).not.toHaveBeenCalled();
  });
});
