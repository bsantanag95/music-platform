import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { TemplatesPanel } from "./TemplatesPanel";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(readonly code: string) {
      super(code);
    }
  },
}));

beforeEach(() => vi.clearAllMocks());

const LIST = "00000000-0000-4000-8000-00000000000a";

const template = (key: string, over: Record<string, unknown> = {}) => ({
  key,
  paused: false,
  pausedAt: null,
  lastRun: { status: "succeeded" as const, startedAt: "2026-10-05T10:00:00.000Z", finishedAt: "2026-10-05T10:00:01.000Z", itemCount: 12, error: null },
  lastSuccessAt: "2026-10-05T10:00:01.000Z",
  nextDueAt: "2026-10-12T10:00:01.000Z",
  current: { listId: LIST, title: "Novedades esenciales", periodKey: "evergreen", inRail: true },
  ...over,
});

describe("TemplatesPanel", () => {
  it("muestra estado, última corrida y colección vigente", () => {
    renderWithIntl(<TemplatesPanel initial={{ templates: [template("new-releases")] }} canPublish />);

    expect(screen.getByRole("heading", { name: "Novedades esenciales" })).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText(/Exitosa/)).toBeInTheDocument();
    expect(screen.getByText(/En el riel/)).toBeInTheDocument();
  });

  it("muestra el último error de una corrida fallida", () => {
    renderWithIntl(
      <TemplatesPanel
        initial={{
          templates: [
            template("new-releases", {
              lastRun: { status: "failed", startedAt: "2026-10-05T10:00:00.000Z", finishedAt: null, itemCount: null, error: "sin conexión" },
            }),
          ],
        }}
        canPublish
      />,
    );

    expect(screen.getByText("Error: sin conexión")).toBeInTheDocument();
  });

  it("sin permiso de publicar no hay controles", () => {
    renderWithIntl(<TemplatesPanel initial={{ templates: [template("new-releases")] }} canPublish={false} />);

    expect(screen.queryByRole("button", { name: "Pausar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Regenerar ahora" })).toBeNull();
  });

  it("pausa solo tras confirmar", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ templates: [template("new-releases", { paused: true, current: null, nextDueAt: null })] });
    renderWithIntl(<TemplatesPanel initial={{ templates: [template("new-releases")] }} canPublish />);

    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(apiFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Pausar" }).at(-1)!);

    await waitFor(() => expect(screen.getByText("Pausada")).toBeInTheDocument());
    expect(vi.mocked(apiFetch).mock.calls[0]![0]).toBe("/api/admin/editorial/templates/new-releases/pause");
    expect(screen.getByRole("button", { name: "Reanudar" })).toBeInTheDocument();
  });

  it("fuerza la regeneración y avisa que corre en segundo plano", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ templates: [template("new-releases")] });
    renderWithIntl(<TemplatesPanel initial={{ templates: [template("new-releases")] }} canPublish />);

    fireEvent.click(screen.getByRole("button", { name: "Regenerar ahora" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Regeneración en curso"));
    expect(vi.mocked(apiFetch).mock.calls[0]![0]).toBe("/api/admin/editorial/templates/new-releases/run");
  });
});
