import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { MarkAsListened } from "./MarkAsListened";

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
    createListenEntry: vi.fn(),
    updateListenEntry: vi.fn(),
    deleteListenEntry: vi.fn(),
    getMyDiary: vi.fn(),
    ApiError,
  };
});

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/diary", () => ({
  createListenEntry: mocks.createListenEntry,
  updateListenEntry: mocks.updateListenEntry,
  deleteListenEntry: mocks.deleteListenEntry,
  getMyDiary: mocks.getMyDiary,
}));
vi.mock("@/lib/api/client", () => ({ ApiError: mocks.ApiError }));

const target = { type: "artist" as const, id: "a1b2c3d4-0000-4000-8000-000000000001" };
const entry = {
  id: "a1b2c3d4-0000-4000-8000-000000000002",
  listenContext: "first_listen" as const,
  body: null,
  reaction: null,
  audience: "followers" as const,
  createdAt: "2026-01-01",
  target: { type: "artist", id: target.id, title: "Pink Floyd", subtitle: null, coverThumbUrl: null },
};

describe("MarkAsListened", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ofrece iniciar sesión a visitantes anónimos", () => {
    renderWithIntl(<MarkAsListened target={target} authenticated={false} />);
    expect(screen.getByRole("link", { name: "Iniciar sesión para marcar escuchas" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });

  it("registra la escucha al instante y abre el panel de ampliación", async () => {
    const user = userEvent.setup();
    mocks.createListenEntry.mockResolvedValue(entry);
    renderWithIntl(<MarkAsListened target={target} authenticated />);

    await user.click(screen.getByRole("button", { name: "Marcar como escuchado" }));
    await waitFor(() => expect(mocks.createListenEntry).toHaveBeenCalledWith(target));
    expect(screen.getByText(/Escucha registrada/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Impresión/)).toBeInTheDocument();
  });

  it("muestra el error localizado cuando el registro falla", async () => {
    const user = userEvent.setup();
    mocks.createListenEntry.mockRejectedValue(new mocks.ApiError("DIARY_TARGET_INVALID", 404, "x"));
    renderWithIntl(<MarkAsListened target={target} authenticated />);

    await user.click(screen.getByRole("button", { name: "Marcar como escuchado" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No pudimos guardar el cambio. Intentá de nuevo.",
    );
  });
});