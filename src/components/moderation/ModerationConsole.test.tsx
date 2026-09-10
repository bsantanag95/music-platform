import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { z } from "zod";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ModerationReportSchema, ModerationReportsResponseSchema } from "@/lib/api/schemas";
import { ModerationConsole } from "./ModerationConsole";
import { apiFetch, ApiError } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

const empty: z.infer<typeof ModerationReportsResponseSchema> = {
  reports: [],
  status: "pending",
  page: 1,
  pageSize: 20,
  hasNext: false,
};

const report: z.infer<typeof ModerationReportSchema> = {
  id: "00000000-0000-4000-8000-000000000001",
  reason: "Spam",
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  targetType: "comment",
  reporter: { id: "00000000-0000-4000-8000-000000000002", username: "denunciante", displayName: null },
  comment: { id: "00000000-0000-4000-8000-000000000003", body: "Contenido inapropiado", moderationStatus: "visible" },
  review: null,
  user: null,
};

describe("ModerationConsole", () => {
  it("muestra un estado vacío sin reportes", () => {
    renderWithIntl(<ModerationConsole initial={empty} initialRestrictions={[]} />);

    expect(screen.getByText("No hay reportes pendientes.")).toBeInTheDocument();
    expect(screen.getByText("Suspender actividad social")).toBeInTheDocument();
  });

  it("ofrece filtros por estado y tipo de objetivo", () => {
    renderWithIntl(<ModerationConsole initial={empty} initialRestrictions={[]} />);

    expect(screen.getByLabelText("Estado")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de objetivo")).toBeInTheDocument();
  });

  it("lista restricciones activas con su expiración", () => {
    renderWithIntl(
      <ModerationConsole
        initial={empty}
        initialRestrictions={[
          {
            id: "00000000-0000-4000-8000-000000000003",
            userId: "00000000-0000-4000-8000-000000000002",
            scope: "social_activity",
            startsAt: "2026-01-01T00:00:00.000Z",
            expiresAt: "2030-01-01T00:00:00.000Z",
            reason: "Spam",
            revokedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            user: { username: "sujeto", displayName: null },
          },
        ]}
      />,
    );

    expect(screen.getByText("sujeto")).toBeInTheDocument();
    expect(screen.getByText("Spam")).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
  });

  it("oculta contenido reportado con motivo y confirmación, y resuelve el reporte", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path.startsWith("/api/moderation/reports?")) return empty;
      return { ok: true };
    });

    renderWithIntl(
      <ModerationConsole initial={{ reports: [report], status: "pending", page: 1, pageSize: 20, hasNext: false }} initialRestrictions={[]} />,
    );

    const card = screen.getByRole("listitem");
    fireEvent.change(within(card).getByPlaceholderText("Motivo de la acción"), { target: { value: "Spam" } });
    fireEvent.click(within(card).getByRole("button", { name: "Ocultar" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/moderation/content/comment/${report.comment!.id}`,
        expect.anything(),
        expect.objectContaining({ method: "PATCH" }),
      );
    });
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/moderation/reports/${report.id}`,
        expect.anything(),
        expect.objectContaining({ body: JSON.stringify({ status: "resolved" }) }),
      );
    });
  });

  it("exige un motivo antes de ocultar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithIntl(
      <ModerationConsole initial={{ reports: [report], status: "pending", page: 1, pageSize: 20, hasNext: false }} initialRestrictions={[]} />,
    );

    fireEvent.click(within(screen.getByRole("listitem")).getByRole("button", { name: "Ocultar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Escribí un motivo antes de continuar.");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("muestra un reporte de usuario con acceso a suspender", () => {
    const userReport: z.infer<typeof ModerationReportSchema> = {
      ...report,
      targetType: "user",
      comment: null,
      review: null,
      user: { id: "00000000-0000-4000-8000-000000000009", username: "sujeto", displayName: null },
    };
    renderWithIntl(
      <ModerationConsole initial={{ reports: [userReport], status: "pending", page: 1, pageSize: 20, hasNext: false }} initialRestrictions={[]} />,
    );

    expect(screen.getByText("@sujeto")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspender al usuario reportado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ocultar" })).not.toBeInTheDocument();
  });

  it("muestra el error de usuario inexistente dentro de la sección de suspensión", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError("USER_NOT_FOUND", 404, "El usuario no existe"));
    renderWithIntl(<ModerationConsole initial={empty} initialRestrictions={[]} />);

    fireEvent.change(screen.getByPlaceholderText("Usuario o email"), { target: { value: "ghost" } });
    fireEvent.change(screen.getByPlaceholderText("Motivo de la acción"), { target: { value: "Spam" } });
    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Suspender" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("El usuario solicitado no existe o no está disponible.");
  });
});