import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { AddToListPanel } from "./AddToListPanel";
import type { ListTarget, UserListSummary } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    getMyLists: vi.fn(),
    addItemToList: vi.fn(),
    createList: vi.fn(),
    ApiError,
  };
});

vi.mock("@/lib/api/lists", () => ({
  getMyLists: mocks.getMyLists,
  addItemToList: mocks.addItemToList,
  createList: mocks.createList,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const artistTarget: ListTarget = { type: "artist", id: "a1b2c3d4-0000-4000-8000-000000000009" };

function compatibleList(id: string, title: string): UserListSummary {
  return {
    id,
    entityType: "artist",
    title,
    description: null,
    audience: "public",
    itemCount: 0,
    ownerId: "owner-1",
    ownerUsername: "owner",
    isOfficial: false,
    isPinned: false,
    isFeatured: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  } as unknown as UserListSummary;
}

describe("AddToListPanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carga las listas propias al montar y agrega el objetivo a la elegida", async () => {
    const user = userEvent.setup();
    mocks.getMyLists.mockResolvedValue({ lists: [compatibleList("l1", "Favoritos de guitarra")], page: 1, pageSize: 50, hasNext: false });
    mocks.addItemToList.mockResolvedValue({});

    renderWithIntl(<AddToListPanel target={artistTarget} />);

    await waitFor(() => expect(mocks.getMyLists).toHaveBeenCalled());
    const listButton = await screen.findByRole("button", { name: "Favoritos de guitarra" });
    await user.click(listButton);

    await waitFor(() => expect(mocks.addItemToList).toHaveBeenCalledWith("l1", artistTarget));
  });

  it("solo ofrece listas compatibles con el tipo del objetivo", async () => {
    mocks.getMyLists.mockResolvedValue({
      lists: [
        compatibleList("l1", "Artistas favoritos"),
        { ...compatibleList("l2", "Discos del año"), entityType: "release-group" },
      ],
      page: 1,
      pageSize: 50,
      hasNext: false,
    });

    renderWithIntl(<AddToListPanel target={artistTarget} />);

    await screen.findByRole("button", { name: "Artistas favoritos" });
    expect(screen.queryByRole("button", { name: "Discos del año" })).not.toBeInTheDocument();
  });

  it("sin listas compatibles, ofrece crear una lista nueva", async () => {
    const user = userEvent.setup();
    mocks.getMyLists.mockResolvedValue({ lists: [], page: 1, pageSize: 50, hasNext: false });

    renderWithIntl(<AddToListPanel target={artistTarget} />);

    await waitFor(() => expect(mocks.getMyLists).toHaveBeenCalled());
    expect(screen.getByText(/creá una lista de artistas/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nueva lista" }));
    expect(screen.getByRole("button", { name: "Crear lista" })).toBeInTheDocument();
  });

  it("el botón de cerrar dispara onClose", async () => {
    const user = userEvent.setup();
    mocks.getMyLists.mockResolvedValue({ lists: [], page: 1, pageSize: 50, hasNext: false });
    const onClose = vi.fn();

    renderWithIntl(<AddToListPanel target={artistTarget} onClose={onClose} />);

    await waitFor(() => expect(mocks.getMyLists).toHaveBeenCalled());
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
