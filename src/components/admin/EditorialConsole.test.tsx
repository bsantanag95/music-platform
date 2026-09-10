import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { EditorialConsole } from "./EditorialConsole";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn(), ApiError: class ApiError extends Error {} }));

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Clásicos del rock",
  description: null,
  audience: "public",
  moderationStatus: "visible",
  isOfficial: false,
  officialPublishedAt: null,
  officialWithdrawnAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: { id: "00000000-0000-4000-8000-000000000002", username: "ana", displayName: null },
};

describe("EditorialConsole", () => {
  it("muestra un estado vacío sin listas", () => {
    renderWithIntl(<EditorialConsole initial={{ lists: [] }} />);

    expect(screen.getByText("No hay listas editoriales.")).toBeInTheDocument();
  });

  it("marca una lista publicada como Oficial", () => {
    renderWithIntl(
      <EditorialConsole initial={{ lists: [{ ...base, isOfficial: true, officialPublishedAt: "2026-02-01T00:00:00.000Z" }] }} />,
    );

    expect(screen.getByText("Oficial")).toBeInTheDocument();
    expect(screen.getByText("Retirar")).toBeInTheDocument();
  });

  it("distingue una lista retirada de una personal", () => {
    renderWithIntl(
      <EditorialConsole initial={{ lists: [
        { ...base, officialWithdrawnAt: "2026-03-01T00:00:00.000Z" },
        { ...base, id: "00000000-0000-4000-8000-000000000005", title: "Mi colección" },
      ] }} />,
    );

    expect(screen.getByText("Retirada")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("indica una lista oculta por moderación", () => {
    renderWithIntl(
      <EditorialConsole initial={{ lists: [{ ...base, moderationStatus: "hidden" }] }} />,
    );

    expect(screen.getByText("Oculta por moderación")).toBeInTheDocument();
  });

  it("publica una lista oficial tras confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/admin/editorial/lists") return { lists: [] };
      return { ok: true };
    });

    renderWithIntl(<EditorialConsole initial={{ lists: [base] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/admin/editorial/lists/${base.id}`,
        expect.anything(),
        expect.objectContaining({ method: "PATCH" }),
      );
    });
  });

  it("no publica si el administrador cancela la confirmación", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderWithIntl(<EditorialConsole initial={{ lists: [base] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    expect(apiFetch).not.toHaveBeenCalled();
  });
});