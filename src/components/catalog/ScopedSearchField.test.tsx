import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { ScopedSearchField } from "./ScopedSearchField";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { artistHref } from "@/lib/catalog-links";
import catalogEs from "../../../messages/es/catalog.json";

const mockPush = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api/catalog", () => ({ getSearchSuggestions: vi.fn() }));

const { getSearchSuggestions } = await import("@/lib/api/catalog");

const SABRINA = {
  kind: "artist" as const,
  id: "11111111-1111-4111-8111-111111111111",
  name: "Sabrina Carpenter",
  artistType: "person" as const,
  disambiguation: null,
};
const SABRINA_FILIPINA = {
  kind: "artist" as const,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Sabrina",
  artistType: "person" as const,
  disambiguation: "Filipina acoustic singer",
};

const labels = catalogEs.search;
const typeButtonName = (type: keyof typeof labels.types) =>
  labels.typeSelector.label.replace("{type}", labels.types[type]);

function field() {
  return screen.getByRole("combobox", { name: labels.fieldLabel }) as HTMLInputElement;
}

function submit() {
  fireEvent.submit(field().closest("form")!);
}

describe("ScopedSearchField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSearchSuggestions).mockResolvedValue({ suggestions: [] });
  });

  it("arranca en Artistas y navega a /search con tipo y texto normalizado", () => {
    renderWithIntl(<ScopedSearchField variant="compact" />);

    expect(screen.getByRole("button", { name: typeButtonName("artist") })).toBeInTheDocument();
    expect(field()).toHaveAttribute("placeholder", labels.placeholder.artist);
    fireEvent.change(field(), { target: { value: "  Poison  " } });
    submit();

    expect(mockPush).toHaveBeenCalledWith("/search?type=artist&q=Poison");
  });

  it("el selector cambia el tipo y el envío lo respeta", () => {
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.click(screen.getByRole("button", { name: typeButtonName("artist") }));
    const listbox = screen.getByRole("listbox", { name: labels.typeSelector.listLabel });
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      labels.types.artist,
      labels.types.album,
      labels.types.song,
      labels.types.user,
    ]);
    fireEvent.click(screen.getByRole("option", { name: labels.types.album }));

    expect(listbox).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: typeButtonName("album") })).toBeInTheDocument();
    fireEvent.change(field(), { target: { value: "kiss destroyer" } });
    submit();
    expect(mockPush).toHaveBeenCalledWith("/search?type=album&q=kiss+destroyer");
  });

  it("el selector se maneja con teclado", () => {
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.click(screen.getByRole("button", { name: typeButtonName("artist") }));
    const listbox = screen.getByRole("listbox", { name: labels.typeSelector.listLabel });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "Enter" });

    expect(screen.getByRole("button", { name: typeButtonName("song") })).toBeInTheDocument();
  });

  it("muestra sugerencias locales y elegir una abre la entidad", async () => {
    vi.mocked(getSearchSuggestions).mockResolvedValue({ suggestions: [SABRINA, SABRINA_FILIPINA] });
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "sabr" } });

    const option = await screen.findByRole("option", { name: /Sabrina Carpenter/ });
    expect(getSearchSuggestions).toHaveBeenCalledWith("artist", "sabr", expect.any(AbortSignal));
    fireEvent.click(option);

    expect(mockPush).toHaveBeenCalledWith(artistHref(SABRINA.name, SABRINA.id));
  });

  it("flechas + Enter eligen la sugerencia activa; Escape cierra", async () => {
    vi.mocked(getSearchSuggestions).mockResolvedValue({ suggestions: [SABRINA, SABRINA_FILIPINA] });
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "sabr" } });
    await screen.findByRole("option", { name: /Filipina/ });

    fireEvent.keyDown(field(), { key: "ArrowDown" });
    fireEvent.keyDown(field(), { key: "ArrowDown" });
    expect(field().getAttribute("aria-activedescendant")).toBeTruthy();
    submit();
    expect(mockPush).toHaveBeenCalledWith(artistHref(SABRINA_FILIPINA.name, SABRINA_FILIPINA.id));

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "sabri" } });
    expect(field()).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(field(), { key: "Escape" });
    expect(field()).toHaveAttribute("aria-expanded", "false");
    expect(field().value).toBe("sabri");
  });

  it("'Buscar en otro tipo' cambia el tipo conservando el texto", async () => {
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "back for the attack" } });
    fireEvent.click(screen.getByRole("button", { name: labels.types.album }));

    expect(screen.getByRole("button", { name: typeButtonName("album") })).toBeInTheDocument();
    expect(field().value).toBe("back for the attack");
    await waitFor(() =>
      expect(getSearchSuggestions).toHaveBeenLastCalledWith("album", "back for the attack", expect.any(AbortSignal)),
    );
  });

  it("si las sugerencias fallan, las acciones y el envío siguen funcionando", async () => {
    vi.mocked(getSearchSuggestions).mockRejectedValue(new Error("500"));
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "farruko" } });

    const seeAll = labels.suggestions.seeAll.replace("{query}", "farruko").replace("{type}", "artistas");
    await waitFor(() => expect(getSearchSuggestions).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("option", { name: seeAll }));
    expect(mockPush).toHaveBeenCalledWith("/search?type=artist&q=farruko");
  });

  it("no pide sugerencias con menos de dos caracteres", async () => {
    renderWithIntl(<ScopedSearchField variant="compact" />);

    fireEvent.focus(field());
    fireEvent.change(field(), { target: { value: "s" } });
    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(getSearchSuggestions).not.toHaveBeenCalled();
  });

  it("con resetAfterNavigate vuelve a vacío y a Artistas tras buscar", () => {
    renderWithIntl(<ScopedSearchField variant="compact" resetAfterNavigate />);

    fireEvent.click(screen.getByRole("button", { name: typeButtonName("artist") }));
    fireEvent.click(screen.getByRole("option", { name: labels.types.song }));
    fireEvent.change(field(), { target: { value: "taste" } });
    submit();

    expect(mockPush).toHaveBeenCalledWith("/search?type=song&q=taste");
    expect(field().value).toBe("");
    expect(screen.getByRole("button", { name: typeButtonName("artist") })).toBeInTheDocument();
  });

  it("variante completa: validación local con entrada vacía, sin navegar", () => {
    renderWithIntl(<ScopedSearchField variant="full" />);

    fireEvent.click(screen.getByRole("button", { name: labels.submit }));

    expect(screen.getByText(labels.validationEmpty)).toBeInTheDocument();
    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
