import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
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
  group: "curated" as const,
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
    expect(screen.getByRole("heading", { name: "Selección editorial" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Descubre" })).toBeInTheDocument();
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
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify({ group: "curated", listIds: [B, A] }) });
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

  it("separa la selección editorial de las automáticas y cuenta el tope de cada rail por su cuenta", () => {
    const automatic = (id: string, title: string, over: Record<string, unknown> = {}) =>
      row(id, title, { source: "template", group: "automatic", templateKey: "plantilla-retirada", periodKey: "evergreen", ...over });
    renderWithIntl(
      <FeaturedPanel
        initial={{ featured: [row(A, "Debuts"), automatic(B, "Cumplen años"), automatic(C, "Grammy", { status: "beyond_limit" })], eligible: [] }}
        canPublish
      />,
    );

    const curated = within(screen.getByRole("region", { name: "Selección editorial" }));
    const auto = within(screen.getByRole("region", { name: "Descubre" }));
    expect(curated.getByText("Debuts")).toBeInTheDocument();
    expect(curated.queryByText("Cumplen años")).toBeNull();
    expect(auto.getByText("Cumplen años")).toBeInTheDocument();
    expect(curated.getByText("1 de 6 tarjetas en el riel ahora")).toBeInTheDocument();
    expect(auto.getByText("1 de 6 tarjetas en el riel ahora")).toBeInTheDocument();
  });

  it("reordena un grupo enviando solo sus ids y su nombre de grupo", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ featured: [], eligible: [] });
    const automatic = (id: string, title: string) =>
      row(id, title, { source: "template", group: "automatic", templateKey: "plantilla-retirada", periodKey: "evergreen" });
    renderWithIntl(
      <FeaturedPanel initial={{ featured: [row(A, "Debuts"), automatic(B, "Primera auto"), automatic(C, "Segunda auto")], eligible: [] }} canPublish />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Bajar Primera auto" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const [url, , init] = vi.mocked(apiFetch).mock.calls[0]!;
    expect(url).toBe("/api/admin/editorial/featured/order");
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify({ group: "automatic", listIds: [C, B] }) });
  });

  it("un grupo sin filas muestra su mensaje de vacío", () => {
    renderWithIntl(<FeaturedPanel initial={{ featured: [row(A, "Debuts")], eligible: [] }} canPublish />);

    expect(screen.getByText("No hay colecciones automáticas vigentes.")).toBeInTheDocument();
  });

  it("muestra las colecciones generadas con el título del idioma de la consola", () => {
    const generated = row(B, "Cumplen años en octubre", {
      source: "template",
      group: "automatic",
      templateKey: "anniversaries",
      periodKey: "2026-10",
    });
    const view = renderWithIntl(<FeaturedPanel initial={{ featured: [generated], eligible: [] }} canPublish />, "en");

    expect(screen.getByRole("heading", { name: "Anniversaries in October 2026" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Anniversaries in October 2026 down" })).toBeTruthy();
    view.unmount();
    renderWithIntl(<FeaturedPanel initial={{ featured: [generated], eligible: [] }} canPublish />);
    expect(screen.getByRole("heading", { name: "Cumplen años en octubre de 2026" })).toBeInTheDocument();
  });

  it("una colección curada conserva el título que escribió el equipo", () => {
    renderWithIntl(<FeaturedPanel initial={{ featured: [row(A, "Mejores debuts")], eligible: [] }} canPublish />, "en");

    expect(screen.getByRole("heading", { name: "Mejores debuts" })).toBeInTheDocument();
  });
});
