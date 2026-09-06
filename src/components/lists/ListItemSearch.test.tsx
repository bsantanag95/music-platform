import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListItemSearch } from "./ListItemSearch";
import type { UserListDetail } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  searchCatalog: vi.fn(),
  getReleaseGroupDetail: vi.fn(),
  addItemToList: vi.fn(),
}));

vi.mock("@/lib/api/catalog", () => ({
  searchCatalog: mocks.searchCatalog,
  getReleaseGroupDetail: mocks.getReleaseGroupDetail,
}));
vi.mock("@/lib/api/lists", () => ({ addItemToList: mocks.addItemToList }));

const listStub = { id: "l1", items: [] } as unknown as UserListDetail;

function albumResult(id: string, name: string) {
  return {
    kind: "release-group" as const,
    id,
    mbid: null,
    name,
    subtitle: "1977",
    artistType: null,
    category: null,
    year: 1977,
    cached: true,
  };
}

describe("ListItemSearch", () => {
  beforeEach(() => vi.clearAllMocks());

  it("agrega un álbum desde los resultados", async () => {
    mocks.searchCatalog.mockResolvedValue({ results: [albumResult("rg1", "Rumours")] });
    mocks.addItemToList.mockResolvedValue(listStub);
    const onAdded = vi.fn();
    renderWithIntl(
      <ListItemSearch
        listId="l1"
        entityType="release-group"
        existingTargetIds={new Set()}
        onAdded={onAdded}
        onClose={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Buscar en el catálogo"), "rumours");
    await waitFor(() => expect(screen.getByText("Rumours")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(mocks.addItemToList).toHaveBeenCalledWith("l1", { type: "release-group", id: "rg1" });
    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(listStub));
  });

  it("marca 'Ya está' un resultado que ya está en la lista", async () => {
    mocks.searchCatalog.mockResolvedValue({ results: [albumResult("rg1", "Rumours")] });
    renderWithIntl(
      <ListItemSearch
        listId="l1"
        entityType="release-group"
        existingTargetIds={new Set(["rg1"])}
        onAdded={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Buscar en el catálogo"), "rumours");
    await waitFor(() => expect(screen.getByText("Ya está")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Agregar" })).toBeNull();
  });

  it("en una lista de canciones abre el tracklist de un álbum y agrega una pista", async () => {
    mocks.searchCatalog.mockResolvedValue({ results: [albumResult("rg1", "Rumours")] });
    mocks.getReleaseGroupDetail.mockResolvedValue({
      release: {},
      cover: null,
      tracks: [
        { recordingId: "rec1", position: 1, discNumber: 1, title: "Dreams", durationSec: null, credits: [] },
      ],
    });
    mocks.addItemToList.mockResolvedValue(listStub);
    renderWithIntl(
      <ListItemSearch
        listId="l1"
        entityType="recording"
        existingTargetIds={new Set()}
        onAdded={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Buscar en el catálogo"), "rumours");
    await waitFor(() => expect(screen.getByText("Rumours")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Ver canciones" }));
    await waitFor(() => expect(screen.getByText("Dreams")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(mocks.addItemToList).toHaveBeenCalledWith("l1", { type: "recording", id: "rec1" });
  });

  it("muestra un error si el alta falla", async () => {
    mocks.searchCatalog.mockResolvedValue({ results: [albumResult("rg1", "Rumours")] });
    mocks.addItemToList.mockRejectedValue(new Error("boom"));
    renderWithIntl(
      <ListItemSearch
        listId="l1"
        entityType="release-group"
        existingTargetIds={new Set()}
        onAdded={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText("Buscar en el catálogo"), "rumours");
    await waitFor(() => expect(screen.getByText("Rumours")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
