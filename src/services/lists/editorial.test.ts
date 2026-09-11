import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  requirePermissionForUser: vi.fn().mockResolvedValue(undefined),
  addItemToList: vi.fn(),
  removeItemFromList: vi.fn(),
  reorderListItems: vi.fn(),
  updateList: vi.fn(),
  getOwnedList: vi.fn().mockResolvedValue({ id: "list-1" }),
}));

vi.mock("@/db", () => ({
  db: {
    select: mocks.select,
    insert: mocks.insert,
    update: mocks.update,
    delete: mocks.delete,
  },
}));
vi.mock("@/services/auth/authorization", () => ({
  requirePermissionForUser: mocks.requirePermissionForUser,
}));
vi.mock("./lists", () => ({
  addItemToList: mocks.addItemToList,
  removeItemFromList: mocks.removeItemFromList,
  reorderListItems: mocks.reorderListItems,
  updateList: mocks.updateList,
  getOwnedList: mocks.getOwnedList,
  normalizeTitle: (value: string) => value,
  normalizeDescription: (value: string | null) => value,
}));

import {
  addEditorialItem,
  createEditorialDraft,
  deleteEditorialDraft,
  editorialStateOf,
  publishOfficialList,
  submitEditorialDraft,
  unpublishOfficialList,
  updateEditorialDraft,
} from "./editorial";

/** Todo `select` devuelve esa fila: sirve tanto al dueño curador como al borrador. */
function selectRows(rows: unknown[] = [{ id: "curator-1", ownerId: "curator-1" }]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  mocks.select.mockReturnValue({ from });
}

function insertReturning(rows: unknown[] = [{ id: "list-1" }]) {
  const values = vi.fn((value: unknown) => {
    void value;
    return { returning: vi.fn().mockResolvedValue(rows) };
  });
  mocks.insert.mockReturnValue({ values });
  return { values };
}

function updateReturning(rows: unknown[] = [{ id: "list-1" }]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mocks.update.mockReturnValue({ set });
  return { set, where };
}

function deleteReturning(rows: unknown[] = [{ id: "list-1" }]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  mocks.delete.mockReturnValue({ where });
  return { where };
}

describe("autoría editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionForUser.mockResolvedValue(undefined);
    mocks.getOwnedList.mockResolvedValue({ id: "list-1" });
  });

  it("crea un borrador con audiencia public y autoría registrada", async () => {
    selectRows();
    const { values } = insertReturning();

    await createEditorialDraft("person-1", {
      entityType: "release-group",
      title: "Clásicos",
    });

    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("person-1", "editorial.author");
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "curator-1",
        audience: "public",
        editorialAuthorId: "person-1",
      }),
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ listId: "list-1", actorId: "person-1", action: "create" }),
    );
  });

  it("edita metadatos forzando la audiencia a public", async () => {
    selectRows();
    insertReturning();
    mocks.updateList.mockResolvedValue({ id: "list-1" });

    await updateEditorialDraft("person-1", "list-1", { title: "Nuevo" });

    expect(mocks.updateList).toHaveBeenCalledWith("list-1", "curator-1", {
      title: "Nuevo",
      audience: "public",
    });
  });

  it("agrega ítems delegando con el dueño curador y registrando la edición", async () => {
    selectRows();
    insertReturning();
    mocks.addItemToList.mockResolvedValue({ id: "list-1" });

    await addEditorialItem("person-1", "list-1", { type: "release-group", id: "rg-1" });

    expect(mocks.addItemToList).toHaveBeenCalledWith("list-1", "curator-1", {
      type: "release-group",
      id: "rg-1",
    });
  });

  it("propone el borrador sin publicarlo", async () => {
    selectRows();
    insertReturning();
    const { set } = updateReturning();

    await submitEditorialDraft("person-1", "list-1");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ editorialSubmittedBy: "person-1", editorialSubmittedAt: expect.any(Date) }),
    );
  });

  it("rechaza editar una lista personal ajena con LIST_NOT_FOUND", async () => {
    selectRows([]);
    await expect(updateEditorialDraft("person-1", "list-1", { title: "X" })).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
    });
  });

  it("solo borra borradores nunca publicados", async () => {
    const { where } = deleteReturning([{ id: "list-1" }]);
    await deleteEditorialDraft("person-1", "list-1");
    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("person-1", "editorial.author");
    expect(where).toHaveBeenCalled();
  });

  it("rechaza borrar cuando la condición editorial no se cumple", async () => {
    deleteReturning([]);
    await expect(deleteEditorialDraft("person-1", "list-1")).rejects.toMatchObject({
      code: "LIST_NOT_FOUND",
    });
  });
});

describe("publicación editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermissionForUser.mockResolvedValue(undefined);
  });

  it("exige editorial.publish y registra la publicación", async () => {
    insertReturning();
    const { set } = updateReturning([{ id: "list-1" }]);

    await publishOfficialList("admin-1", "list-1");

    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("admin-1", "editorial.publish");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isOfficial: true }));
  });

  it("retira y registra la acción", async () => {
    insertReturning();
    const { set } = updateReturning([{ id: "list-1" }]);

    await unpublishOfficialList("admin-1", "list-1");

    expect(mocks.requirePermissionForUser).toHaveBeenCalledWith("admin-1", "editorial.publish");
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ isOfficial: false }));
  });
});

describe("estado editorial", () => {
  it("deriva draft/submitted/published/withdrawn/personal", () => {
    const base = { officialWithdrawnAt: null, editorialAuthorId: "person-1", editorialSubmittedAt: null };
    expect(editorialStateOf({ ...base, isOfficial: false })).toBe("draft");
    expect(
      editorialStateOf({ ...base, isOfficial: false, editorialSubmittedAt: new Date() }),
    ).toBe("submitted");
    expect(editorialStateOf({ ...base, isOfficial: true })).toBe("published");
    expect(
      editorialStateOf({ ...base, isOfficial: false, officialWithdrawnAt: new Date() }),
    ).toBe("withdrawn");
    expect(editorialStateOf({ ...base, isOfficial: false, editorialAuthorId: null })).toBe(
      "personal",
    );
  });
});
