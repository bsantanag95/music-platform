import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("no ofrece opinión: no importa las APIs de rating ni de reseña", () => {
    const source = readFileSync(join(__dirname, "ListenEntryForm.tsx"), "utf8");
    expect(source).not.toMatch(/api\/ratings|api\/reviews|@\/lib\/api\/rating/);
  });

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

  describe("la audiencia sigue a la intención (deepen-listening-diary)", () => {
    const privateEmpty = {
      listenContext: "first_listen" as const,
      body: null,
      reaction: null,
      audience: "private" as const,
    };

    it("una entrada que nace privada sube a Seguidores al escribir una impresión, y vuelve a Privado al borrarla", async () => {
      const user = userEvent.setup();
      renderWithIntl(<ListenEntryForm entryId={entryId} initial={privateEmpty} />);

      expect(screen.getByRole("radio", { name: "Privado" })).toBeChecked();

      await user.type(screen.getByLabelText(/Impresión/), "qué disco");
      await waitFor(() => expect(screen.getByRole("radio", { name: "Seguidores" })).toBeChecked());

      await user.clear(screen.getByLabelText(/Impresión/));
      await waitFor(() => expect(screen.getByRole("radio", { name: "Privado" })).toBeChecked());
    });

    it("una reacción también sube la audiencia a Seguidores", async () => {
      const user = userEvent.setup();
      renderWithIntl(<ListenEntryForm entryId={entryId} initial={privateEmpty} />);

      await user.click(screen.getByRole("radio", { name: "Me encantó" }));
      await waitFor(() => expect(screen.getByRole("radio", { name: "Seguidores" })).toBeChecked());
    });

    it("elegir una audiencia a mano congela la sugerencia", async () => {
      const user = userEvent.setup();
      mocks.updateListenEntry.mockResolvedValue(saved);
      renderWithIntl(<ListenEntryForm entryId={entryId} initial={privateEmpty} />);

      await user.click(screen.getByRole("radio", { name: "Público" }));
      await user.type(screen.getByLabelText(/Impresión/), "algo");

      // no vuelve a "Seguidores": la elección explícita manda
      await waitFor(() => expect(screen.getByRole("radio", { name: "Público" })).toBeChecked());
      await user.click(screen.getByRole("button", { name: "Guardar" }));
      await waitFor(() =>
        expect(mocks.updateListenEntry).toHaveBeenCalledWith(
          entryId,
          expect.objectContaining({ audience: "public" }),
        ),
      );
    });

    it("una entrada que ya venía con Seguidores no cambia sola al escribir", async () => {
      const user = userEvent.setup();
      renderWithIntl(
        <ListenEntryForm entryId={entryId} initial={{ ...privateEmpty, audience: "followers" }} />,
      );

      await user.type(screen.getByLabelText(/Impresión/), "nota");
      expect(screen.getByRole("radio", { name: "Seguidores" })).toBeChecked();
      // y tampoco baja a Privado al vaciarla
      await user.clear(screen.getByLabelText(/Impresión/));
      expect(screen.getByRole("radio", { name: "Seguidores" })).toBeChecked();
    });
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