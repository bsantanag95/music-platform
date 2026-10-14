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
  family: "discovery" as const,
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
    expect(screen.getByText("1 de 10 tarjetas en el riel ahora")).toBeInTheDocument();
    // Un solo orden para todo el riel: ya no hay un bloque por origen (ADR 0038).
    expect(screen.queryByRole("heading", { name: "Selección editorial" })).toBeNull();
    expect(screen.getByText(/Un solo orden para todo el riel/)).toBeInTheDocument();
    // El origen de cada fila sigue visible: es lo que dice qué sobreescribe la próxima corrida.
    expect(screen.getAllByText(/Curada/).length).toBeGreaterThan(0);
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
    fireEvent.change(screen.getByLabelText("Tipo de colección"), { target: { value: "awards" } });
    fireEvent.click(screen.getByRole("button", { name: "Destacar" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const [url, , init] = vi.mocked(apiFetch).mock.calls[0]!;
    expect(url).toBe("/api/admin/editorial/featured");
    // Destacar a mano exige la familia: sin ella la colección no tendría dónde ubicarse.
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ listId: C, family: "awards" }) });
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

  it("mezcla curadas y automáticas en una sola secuencia, con un tope único", () => {
    const automatic = (id: string, title: string, over: Record<string, unknown> = {}) =>
      row(id, title, { source: "template", group: "automatic", templateKey: "plantilla-retirada", periodKey: "evergreen", family: "ephemeris", ...over });
    renderWithIntl(
      <FeaturedPanel
        initial={{ featured: [row(A, "Debuts"), automatic(B, "Cumplen años"), automatic(C, "Grammy", { status: "beyond_limit" })], eligible: [] }}
        canPublish
      />,
    );

    // Una sola lista en el orden del riel: las tres filas conviven.
    const rows = screen.getAllByRole("listitem");
    expect(rows.map((item) => item.querySelector("h3")?.textContent)).toEqual(["Debuts", "Cumplen años", "Grammy"]);
    // El tope se cuenta sobre todo el riel, no por origen.
    expect(screen.getByText("2 de 10 tarjetas en el riel ahora")).toBeInTheDocument();
    // Cada fila dice su origen y su familia.
    expect(within(rows[0]!).getByText(/Curada/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/Automática/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText(/Efemérides/)).toBeInTheDocument();
  });

  it("reordena enviando la secuencia completa, cruzando los dos orígenes", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ featured: [], eligible: [] });
    const automatic = (id: string, title: string) =>
      row(id, title, { source: "template", group: "automatic", templateKey: "plantilla-retirada", periodKey: "evergreen", family: "ephemeris" });
    renderWithIntl(
      <FeaturedPanel initial={{ featured: [row(A, "Debuts"), automatic(B, "Primera auto"), automatic(C, "Segunda auto")], eligible: [] }} canPublish />,
    );

    // Subir la primera automática la pasa por delante de la curada: un solo orden.
    fireEvent.click(screen.getByRole("button", { name: "Subir Primera auto" }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
    const [url, , init] = vi.mocked(apiFetch).mock.calls[0]!;
    expect(url).toBe("/api/admin/editorial/featured/order");
    expect(init).toMatchObject({ method: "PUT", body: JSON.stringify({ listIds: [B, A, C] }) });
  });

  it("sin filas vigentes muestra un solo mensaje de vacío", () => {
    renderWithIntl(
      <FeaturedPanel
        initial={{ featured: [row(A, "Vieja", { status: "expired", orderable: false })], eligible: [] }}
        canPublish
      />,
    );

    expect(screen.getByText(/Todavía no hay colecciones destacadas/)).toBeInTheDocument();
  });

  it("muestra las colecciones generadas con el título del idioma de la consola", () => {
    const generated = row(B, "Cumplen años en octubre", {
      source: "template",
      group: "automatic",
      templateKey: "anniversaries",
      periodKey: "2026-10",
      family: "ephemeris",
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
