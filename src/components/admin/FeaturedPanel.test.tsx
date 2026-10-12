import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FeaturedPanel } from "./FeaturedPanel";
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

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";

const row = (listId: string, title: string, over: Record<string, unknown> = {}) => ({
  listId,
  title,
  source: "curated" as const,
  templateKey: null,
  periodKey: null,
  rank: 1,
  weight: 0,
  startsAt: "2026-10-01T00:00:00.000Z",
  expiresAt: null,
  itemCount: 7,
  status: "in_rail" as const,
  orderable: true,
  ...over,
});

const initial = {
  featured: [row(A, "Primera"), row(B, "Segunda", { status: "withdrawn" })],
  eligible: [{ id: C, title: "Lista nueva" }],
};

describe("FeaturedPanel", () => {
  it("muestra origen, estado y cuántas tarjetas hay en el riel", () => {
    renderWithIntl(<FeaturedPanel initial={initial} canPublish />);

    expect(screen.getByText("Primera")).toBeInTheDocument();
    expect(screen.getByText("En el riel")).toBeInTheDocument();
    expect(screen.getByText("Fuera del riel: lista retirada")).toBeInTheDocument();
    expect(screen.getByText("1 de 6 tarjetas en el riel ahora")).toBeInTheDocument();
  });

  it("sin permiso de publicar es de solo lectura", () => {
    renderWithIntl(<FeaturedPanel initial={initial} canPublish={false} />);

    expect(screen.getByText(/requiere permiso de publicación/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Subir/ })).toBeNull();
    expect(screen.queryByRole("form", { name: "Destacar una lista" })).toBeNull();
  });

  it("baja una colección enviando el orden completo", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(initial);
    renderWithIntl(<FeaturedPanel initial={initial} canPublish />);

    fireEvent.click(screen.getByRole("button", { name: "Bajar Primera" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const [url, , init] = vi.mocked(apiFetch).mock.calls[0]!;
    expect(url).toBe("/api/admin/editorial/featured/order");
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify({ listIds: [B, A] }) });
  });

  it("no deja subir la primera ni bajar la última", () => {
    renderWithIntl(<FeaturedPanel initial={initial} canPublish />);

    expect(screen.getByRole("button", { name: "Subir Primera" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bajar Segunda" })).toBeDisabled();
  });

  it("destaca una lista elegible", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(initial);
    renderWithIntl(<FeaturedPanel initial={initial} canPublish />);

    fireEvent.change(screen.getByLabelText("Lista oficial"), { target: { value: C } });
    fireEvent.click(screen.getByRole("button", { name: "Destacar" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const [url, , init] = vi.mocked(apiFetch).mock.calls[0]!;
    expect(url).toBe("/api/admin/editorial/featured");
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ listId: C }) });
  });

  it("quita una colección solo tras confirmar", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(null).mockResolvedValueOnce(initial);
    renderWithIntl(<FeaturedPanel initial={initial} canPublish />);

    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" })[0]!);
    expect(apiFetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" }).at(-1)!);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    expect(vi.mocked(apiFetch).mock.calls[0]![0]).toBe(`/api/admin/editorial/featured/${A}`);
    expect(vi.mocked(apiFetch).mock.calls[0]![2]).toMatchObject({ method: "DELETE" });
  });

  it("agrupa las vencidas aparte y sin controles de orden", () => {
    renderWithIntl(
      <FeaturedPanel
        initial={{ featured: [row(A, "Vigente"), row(B, "Vieja", { status: "expired", orderable: false })], eligible: [] }}
        canPublish
      />,
    );

    expect(screen.getByText(/Vencidas \(1\)/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Subir Vieja" })).toBeNull();
    expect(screen.getByText("No hay listas oficiales por destacar. Publica una en la pestaña Listas.")).toBeInTheDocument();
  });
});
