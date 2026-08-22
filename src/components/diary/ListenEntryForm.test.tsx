import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListenEntryForm } from "./ListenEntryForm";

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
    updateListenEntry: vi.fn(),
    deleteListenEntry: vi.fn(),
    createListenEntry: vi.fn(),
    getMyDiary: vi.fn(),
    ApiError,
  };
});

vi.mock("@/lib/api/diary", () => ({
  updateListenEntry: mocks.updateListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
  createListenEntry: mocks.createListenEntry,
  getMyDiary: mocks.getMyDiary,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const entryId = "a1b2c3d4-0000-4000-8000-000000000001";
const initial = {
  listenContext: "first_listen" as const,
  body: "Genial",
  reaction: "loved" as const,
  audience: "followers" as const,
};
const saved = {
  id: entryId,
  listenContext: "relisten",
  body: "Genial",
  reaction: "loved",
  audience: "private",
  createdAt: "2026-01-01",
  target: { type: "artist", id: "a1b2c3d4-0000-4000-8000-000000000002", title: "X", subtitle: null, coverThumbUrl: null },
};

describe("ListenEntryForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("muestra los campos con los valores iniciales", () => {
    renderWithIntl(<ListenEntryForm entryId={entryId} initial={initial} />);
    expect(screen.getByLabelText(/Impresión/)).toHaveValue("Genial");
    expect(screen.getByLabelText("Contexto")).toHaveValue("first_listen");
    expect(screen.getByRole("radio", { name: "Me encantó" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Seguidores" })).toBeChecked();
  });

  it("guarda los cambios mediante PATCH y avisa al padre", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mocks.updateListenEntry.mockResolvedValue(saved);
    renderWithIntl(<ListenEntryForm entryId={entryId} initial={initial} onSaved={onSaved} />);

    await user.selectOptions(screen.getByLabelText("Contexto"), "relisten");
    await user.click(screen.getByRole("radio", { name: "Privado" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(mocks.updateListenEntry).toHaveBeenCalledWith(entryId, {
        listenContext: "relisten",
        body: "Genial",
        reaction: "loved",
        audience: "private",
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(saved);
  });

  it("envía body null cuando la impresión queda vacía", async () => {
    const user = userEvent.setup();
    mocks.updateListenEntry.mockResolvedValue(saved);
    renderWithIntl(<ListenEntryForm entryId={entryId} initial={{ ...initial, body: null }} />);

    await user.type(screen.getByLabelText(/Impresión/), "   ");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mocks.updateListenEntry).toHaveBeenCalledWith(
        entryId,
        expect.objectContaining({ body: null }),
      ),
    );
  });

  it("envía reaction null al elegir Sin reacción", async () => {
    const user = userEvent.setup();
    mocks.updateListenEntry.mockResolvedValue({ ...saved, reaction: null });
    renderWithIntl(<ListenEntryForm entryId={entryId} initial={initial} />);

    await user.click(screen.getByRole("radio", { name: "Sin reacción" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() =>
      expect(mocks.updateListenEntry).toHaveBeenCalledWith(
        entryId,
        expect.objectContaining({ reaction: null }),
      ),
    );
  });

  it("muestra error localizado si el guardado falla", async () => {
    const user = userEvent.setup();
    mocks.updateListenEntry.mockRejectedValue(new mocks.ApiError("VALIDATION_ERROR", 400, "x"));
    renderWithIntl(<ListenEntryForm entryId={entryId} initial={initial} />);

    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el cambio. Intentá de nuevo.",
    );
  });
});