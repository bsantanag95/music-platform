import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), options: vi.fn(), candidates: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/lib/api/laminas", () => ({
  createLamina: mocks.create,
  fetchLaminaSourceOptions: mocks.options,
  fetchLaminaCandidates: mocks.candidates,
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));

import { LaminaCreateForm } from "./LaminaCreateForm";

const id = (n: number) => `10000000-0000-4000-8000-00000000000${n}`;
const candidate = (n: number) => ({ target: { id: id(n), title: `Disco ${n}`, artistName: "Banda", coverThumbUrl: null }, score: null });
const options = {
  years: [2026, 1999],
  decades: [2020, 1990],
  listenYears: [2026],
  genres: [{ slug: "metal", name: "Metal", nameEs: null, itemCount: 2 }],
  artists: [{ id: "40000000-0000-4000-8000-000000000001", name: "Banda", itemCount: 7 }],
  lists: [],
};

const render = () => renderWithIntl(<LaminaCreateForm currentYear={2026} />);
const openRatings = async () => {
  render();
  await userEvent.click(screen.getByRole("button", { name: "Mis valoraciones" }));
  await screen.findByRole("checkbox", { name: /Disco 1/ });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.options.mockResolvedValue(options);
  mocks.candidates.mockResolvedValue([1, 2, 3, 4, 5, 6, 7].map(candidate));
  mocks.create.mockResolvedValue({ id: "20000000-0000-4000-8000-000000000001" });
});

describe("LaminaCreateForm", () => {
  it("a mano crea sin ítems y ofrece títulos para tocar", async () => {
    render();
    await userEvent.click(screen.getByRole("button", { name: "Mis 5 discos de 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(mocks.create).toHaveBeenCalledWith({ title: "Mis 5 discos de 2026", format: "top5", entityType: "release-group", targetIds: undefined });
    expect(mocks.options).not.toHaveBeenCalled();
  });

  it("desde una fuente elige los primeros y sugiere el título", async () => {
    await openRatings();
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Mis 5 discos mejor valorados");
    expect(screen.getByRole("checkbox", { name: /Disco 5/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Disco 6/ })).toBeDisabled();
    expect(screen.getByText(/Nace solo para ti/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ targetIds: [1, 2, 3, 4, 5].map(id) }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it("quitar el tercero y marcar el sexto arma esos cinco, en orden", async () => {
    await openRatings();
    await userEvent.click(screen.getByRole("checkbox", { name: /Disco 3/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Disco 6/ }));
    await userEvent.click(screen.getByRole("button", { name: "Crear" }));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ targetIds: [1, 2, 4, 5, 6].map(id) }));
  });

  it("un filtro pide de nuevo, reinicia la selección y cambia el título", async () => {
    await openRatings();
    await userEvent.click(screen.getByRole("checkbox", { name: /Disco 1/ }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Año o década" }), "2026");
    await waitFor(() => expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Mis 5 discos de 2026"));
    expect(mocks.candidates).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ year: 2026 }), expect.anything());
    expect(await screen.findByRole("checkbox", { name: /Disco 1/ })).toBeChecked();
  });

  it("un título escrito no se pisa", async () => {
    await openRatings();
    const field = screen.getByRole("textbox", { name: "Título" });
    await userEvent.clear(field);
    await userEvent.type(field, "Lo mío");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Género" }), "Metal");
    await waitFor(() => expect(mocks.candidates).toHaveBeenCalledTimes(2));
    expect(field).toHaveValue("Lo mío");
  });

  it("sin resultados lo dice y no deja crear", async () => {
    await openRatings();
    mocks.candidates.mockResolvedValue([]);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Artista" }), "Banda");
    expect(await screen.findByText(/Nada con estos filtros/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Crear" })).toBeDisabled();
  });

  it("una fuente vacía lo dice", async () => {
    mocks.options.mockResolvedValue({ ...options, years: [], decades: [], artists: [], genres: [], listenYears: [] });
    mocks.candidates.mockResolvedValue([]);
    render();
    await userEvent.click(screen.getByRole("button", { name: "Mis favoritos" }));
    expect(await screen.findByText(/no tienes favoritos/)).toBeTruthy();
  });

  it("una lista se elige sola y titula con su nombre", async () => {
    const list = { id: "30000000-0000-4000-8000-000000000001", title: "Viaje", itemCount: 7 };
    mocks.options.mockResolvedValue({ ...options, lists: [list] });
    render();
    await userEvent.click(screen.getByRole("button", { name: "Una lista" }));
    await screen.findByRole("checkbox", { name: /Disco 1/ });
    expect(mocks.candidates).toHaveBeenCalledWith(expect.objectContaining({ source: "list" }), { list: list.id }, expect.anything());
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Top 5 de Viaje");
  });

  describe("inspirada en otra Lámina", () => {
    const inspiration = { id: "50000000-0000-4000-8000-000000000001", title: "Mi año", format: "top10", entityType: "recording", ownerUsername: "ana" } as const;
    const renderInspired = () => renderWithIntl(<LaminaCreateForm currentYear={2026} inspiration={inspiration} />);

    it("trae formato y tipo, y el título solo como sugerencia", () => {
      renderInspired();
      expect(screen.getByRole("button", { name: "Top 10" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Canciones" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("");
      expect(screen.getByRole("link", { name: "Como la de @ana" })).toHaveAttribute("href", `/users/ana/cards/${inspiration.id}`);
    });

    it("tocar la sugerencia la deja en el campo, sin ítems ajenos", async () => {
      renderInspired();
      await userEvent.click(screen.getByRole("button", { name: "Mi año" }));
      expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Mi año");
      await userEvent.click(screen.getByRole("button", { name: "Crear" }));
      expect(mocks.create).toHaveBeenCalledWith({ title: "Mi año", format: "top10", entityType: "recording", targetIds: undefined });
    });

    it("la sugerencia sigue con una fuente", async () => {
      renderInspired();
      await userEvent.click(screen.getByRole("button", { name: "Mis valoraciones" }));
      await screen.findByRole("checkbox", { name: /Disco 1/ });
      expect(screen.getByRole("button", { name: "Mi año" })).toBeTruthy();
    });
  });

  it("un fallo al cargar se muestra", async () => {
    mocks.candidates.mockRejectedValue(new Error("no"));
    render();
    await userEvent.click(screen.getByRole("button", { name: "Mis valoraciones" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
