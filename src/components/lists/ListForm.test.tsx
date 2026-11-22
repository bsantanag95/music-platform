import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ListForm } from "./ListForm";

const mocks = vi.hoisted(() => ({ createList: vi.fn() }));
vi.mock("@/lib/api/lists", () => ({ createList: mocks.createList }));
vi.mock("@/components/quick-actions/use-target-search", () => ({
  TARGET_SEARCH_MIN_LENGTH: 2,
  useTargetSearch: () => ({ query: "", searchable: false, candidates: [], pending: false, failed: false }),
}));
vi.mock("@/lib/api/genres", () => ({ searchGenres: vi.fn() }));

// Tema obligatorio y sin preselección en el formulario de lista (openspec: add-list-themes-phase1).
describe("ListForm: tema", () => {
  beforeEach(() => vi.clearAllMocks());

  it("Crear queda deshabilitado hasta elegir un tema, y lo envía", async () => {
    mocks.createList.mockResolvedValue({ id: "l1" });
    renderWithIntl(<ListForm fixedEntityType="release-group" />);
    await userEvent.type(screen.getByRole("textbox", { name: /Título/ }), "Doom para empezar");

    const create = screen.getByRole("button", { name: "Crear lista" });
    expect(create).toBeDisabled();
    const themeRadios = screen.getAllByRole("radio").filter((r) => r.getAttribute("name")?.startsWith("list-theme"));
    expect(themeRadios).toHaveLength(10);
    for (const radio of themeRadios) expect(radio).not.toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: /Por dónde empezar/ }));
    expect(create).toBeEnabled();
    await userEvent.click(create);
    expect(mocks.createList).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Doom para empezar", theme: "start_here", subjectArtistId: null, subjectGenreId: null }),
    );
  });
});
