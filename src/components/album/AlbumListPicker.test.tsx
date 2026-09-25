import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumListPicker, type PickerMembership } from "./AlbumListPicker";

const mocks = vi.hoisted(() => ({
  getMyLists: vi.fn(),
  addItemToList: vi.fn(),
  removeItemFromList: vi.fn(),
  getMyCaminos: vi.fn(),
  addAlbumToCamino: vi.fn(),
  removeAlbumFromCamino: vi.fn(),
}));
vi.mock("@/lib/api/lists", () => ({
  getMyLists: mocks.getMyLists,
  addItemToList: mocks.addItemToList,
  removeItemFromList: mocks.removeItemFromList,
}));
vi.mock("@/lib/api/camino", () => ({
  getMyCaminos: mocks.getMyCaminos,
  addAlbumToCamino: mocks.addAlbumToCamino,
  removeAlbumFromCamino: mocks.removeAlbumFromCamino,
}));
vi.mock("@/components/lists/ListForm", () => ({
  ListForm: ({ onCreated }: { onCreated: (list: { id: string; title: string }) => void }) => (
    <button type="button" onClick={() => onCreated({ id: "new-list", title: "Pop 2025" })}>
      crear lista
    </button>
  ),
}));
vi.mock("@/components/camino/CaminoForm", () => ({ CaminoForm: () => <div>formulario de Camino</div> }));

const picker = catalogEs.album.relation.picker;
const RG = "550e8400-e29b-41d4-a716-446655440000";

function list(id: string, title: string) {
  return { id, title, entityType: "release-group" };
}

function listsPage(lists: ReturnType<typeof list>[], hasNext = false) {
  return { lists, page: 1, pageSize: 20, hasNext };
}

function camino(id: string, title: string, state = "in_progress") {
  return { id, title, state, progress: { selectedCount: 1, listenedCount: 0 }, coverThumbUrl: null, updatedAt: "" };
}

let latest: PickerMembership[] = [];

function Harness({ initial }: { initial: PickerMembership[] }) {
  const [memberships, setMemberships] = useState(initial);
  latest = memberships;
  return (
    <AlbumListPicker
      releaseGroupId={RG}
      memberships={memberships}
      onMembershipsChange={(update) => setMemberships(update)}
      onClose={vi.fn()}
    />
  );
}

function renderPicker(initial: PickerMembership[] = []) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <Harness initial={initial} />
    </QueryClientProvider>,
  );
}

const oldMembership: PickerMembership = { listId: "old", itemId: "item-old", kind: "standard", title: "Hard Rock 1998" };

beforeEach(() => {
  vi.clearAllMocks();
  latest = [];
  mocks.getMyLists.mockResolvedValue(listsPage([list("l1", "Glam Metal"), list("l2", "Underrated AOR")]));
  mocks.getMyCaminos.mockResolvedValue({
    caminos: [camino("c1", "Pink Floyd"), camino("c2", "Archivado", "archived")],
    trackedLists: [],
  });
});

describe("AlbumListPicker", () => {
  it("marca la pertenencia inicial aunque la lista no venga en la primera página", async () => {
    renderPicker([oldMembership]);
    expect(await screen.findByRole("checkbox", { name: "Glam Metal" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hard Rock 1998" })).toBeChecked();
    expect(mocks.getMyLists).toHaveBeenCalledWith(1, 20, { entityType: "release-group" });
  });

  it("mientras carga muestra la pertenencia y avisa que faltan listas por cargar", () => {
    mocks.getMyLists.mockReturnValue(new Promise(() => {}));
    mocks.getMyCaminos.mockReturnValue(new Promise(() => {}));
    renderPicker([oldMembership]);
    expect(screen.getByRole("checkbox", { name: "Hard Rock 1998" })).toBeChecked();
    expect(screen.getAllByText(picker.loading)).toHaveLength(2);
  });

  it("oculta los Caminos archivados", async () => {
    renderPicker();
    expect(await screen.findByRole("checkbox", { name: "Pink Floyd" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Archivado" })).not.toBeInTheDocument();
  });

  it("marcar agrega el álbum con el ítem devuelto; desmarcar lo quita", async () => {
    mocks.addItemToList.mockResolvedValue({ items: [{ id: "item-1", position: 1, target: { id: RG } }] });
    mocks.removeItemFromList.mockResolvedValue({});
    renderPicker();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Glam Metal" }));
    await waitFor(() => expect(latest).toEqual([{ listId: "l1", itemId: "item-1", kind: "standard", title: "Glam Metal" }]));
    expect(mocks.addItemToList).toHaveBeenCalledWith("l1", { type: "release-group", id: RG });

    fireEvent.click(screen.getByRole("checkbox", { name: "Glam Metal" }));
    await waitFor(() => expect(mocks.removeItemFromList).toHaveBeenCalledWith("l1", "item-1"));
    expect(screen.getByRole("checkbox", { name: "Glam Metal" })).not.toBeChecked();
  });

  it("si falla el alta en un Camino, la casilla se revierte y se muestra el error", async () => {
    mocks.addAlbumToCamino.mockRejectedValue(new Error("red"));
    renderPicker();

    fireEvent.click(await screen.findByRole("checkbox", { name: "Pink Floyd" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(picker.saveError);
    expect(screen.getByRole("checkbox", { name: "Pink Floyd" })).not.toBeChecked();
    expect(latest).toEqual([]);
  });

  it("la búsqueda consulta al servidor con q", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderPicker();
      fireEvent.change(screen.getByRole("searchbox", { name: picker.search }), { target: { value: "hard rock" } });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await waitFor(() =>
        expect(mocks.getMyLists).toHaveBeenCalledWith(1, 20, { entityType: "release-group", q: "hard rock" }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("crear una lista desde el selector la deja marcada", async () => {
    mocks.addItemToList.mockResolvedValue({ items: [{ id: "item-new", position: 1, target: { id: RG } }] });
    renderPicker();
    fireEvent.click(await screen.findByRole("button", { name: picker.newListLabel }));
    fireEvent.click(screen.getByRole("button", { name: "crear lista" }));

    await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pop 2025" })).toBeChecked());
    expect(mocks.addItemToList).toHaveBeenCalledWith("new-list", { type: "release-group", id: RG });
  });
});
