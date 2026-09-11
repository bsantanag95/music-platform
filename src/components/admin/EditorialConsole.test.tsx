import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { EditorialConsole } from "./EditorialConsole";
import { apiFetch } from "@/lib/api/client";

vi.mock("@/lib/api/client", () => ({ apiFetch: vi.fn(), ApiError: class ApiError extends Error {} }));

beforeEach(() => vi.clearAllMocks());

const base = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Clásicos del rock",
  description: null,
  audience: "public",
  moderationStatus: "visible",
  isOfficial: false,
  officialPublishedAt: null,
  officialWithdrawnAt: null,
  editorialSubmittedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: { id: "00000000-0000-4000-8000-000000000002", username: "exploracion", displayName: null },
  author: null,
  state: "personal" as const,
};

const author = { id: "00000000-0000-4000-8000-000000000003", username: "nina", displayName: null };
const publishPermissions = ["editorial.publish"] as const;
const authorPermissions = ["editorial.author"] as const;

describe("EditorialConsole", () => {
  it("muestra un estado vacío sin listas", () => {
    renderWithIntl(<EditorialConsole initial={{ lists: [] }} permissions={[]} />);

    expect(screen.getByText("No hay listas editoriales.")).toBeInTheDocument();
  });

  it("marca una lista publicada como Oficial", () => {
    renderWithIntl(
      <EditorialConsole
        initial={{ lists: [{ ...base, isOfficial: true, state: "published", officialPublishedAt: "2026-02-01T00:00:00.000Z" }] }}
        permissions={[...publishPermissions]}
      />,
    );

    expect(screen.getByText("Oficial")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirar" })).toBeInTheDocument();
  });

  it("distingue borrador, propuesta, retirada y personal", () => {
    renderWithIntl(
      <EditorialConsole
        initial={{ lists: [
          { ...base, state: "draft", author },
          { ...base, id: "00000000-0000-4000-8000-000000000004", title: "En revisión", state: "submitted", author, editorialSubmittedAt: "2026-02-01T00:00:00.000Z" },
          { ...base, id: "00000000-0000-4000-8000-000000000005", title: "Otra lista", state: "withdrawn", officialWithdrawnAt: "2026-03-01T00:00:00.000Z" },
          { ...base, id: "00000000-0000-4000-8000-000000000006", title: "Mi colección", state: "personal" },
        ] }}
        permissions={[...authorPermissions, ...publishPermissions]}
      />,
    );

    expect(screen.getByText("Borrador")).toBeInTheDocument();
    expect(screen.getByText("Propuesta")).toBeInTheDocument();
    expect(screen.getByText("Retirada")).toBeInTheDocument();
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("muestra la autoría de la persona que creó el borrador", () => {
    renderWithIntl(
      <EditorialConsole
        initial={{ lists: [{ ...base, state: "draft", author }] }}
        permissions={[...authorPermissions]}
      />,
    );

    expect(screen.getByText("creada por @nina")).toBeInTheDocument();
  });

  it("indica una lista oculta por moderación", () => {
    renderWithIntl(
      <EditorialConsole
        initial={{ lists: [{ ...base, moderationStatus: "hidden" }] }}
        permissions={[...publishPermissions]}
      />,
    );

    expect(screen.getByText("Oculta por moderación")).toBeInTheDocument();
  });

  it("el curador puede proponer y eliminar un borrador, pero no publicarlo", () => {
    renderWithIntl(
      <EditorialConsole
        initial={{ lists: [{ ...base, state: "draft", author }] }}
        permissions={[...authorPermissions]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Publicar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proponer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });

  it("publica una lista tras confirmar en el diálogo", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string) => {
      if (path === "/api/admin/editorial/lists") return { lists: [] };
      return { ok: true };
    });

    renderWithIntl(
      <EditorialConsole initial={{ lists: [base] }} permissions={[...publishPermissions]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Publicar" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/admin/editorial/lists/${base.id}/publish`,
        expect.anything(),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("no publica si se cancela la confirmación", async () => {
    renderWithIntl(
      <EditorialConsole initial={{ lists: [base] }} permissions={[...publishPermissions]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("elimina un borrador nunca publicado tras confirmar", async () => {
    vi.mocked(apiFetch).mockImplementation(async (path: string, _schema: unknown, init?: RequestInit) => {
      if (path === "/api/admin/editorial/lists") return { lists: [] };
      if (init?.method === "DELETE") return null;
      return { ok: true };
    });

    renderWithIntl(
      <EditorialConsole initial={{ lists: [{ ...base, state: "draft", author }] }} permissions={[...authorPermissions]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        `/api/admin/editorial/lists/${base.id}`,
        expect.anything(),
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });
});
