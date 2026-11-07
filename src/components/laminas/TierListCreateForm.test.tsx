import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), search: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/api/laminas", () => ({ createTierListFromDiscography: mocks.create }));
vi.mock("@/components/quick-actions/use-target-search", () => ({ useTargetSearch: mocks.search }));

import { TierListCreateForm } from "./TierListCreateForm";

const ARTIST = "30000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.mockImplementation((_type: string, query: string) => ({
    candidates: query ? [{ type: "artist", id: ARTIST, title: "Metallica", subtitle: "Grupo" }] : [],
    searchable: query.length >= 2,
  }));
});

describe("TierListCreateForm", () => {
  it("elige un artista, sugiere el título y arma la tier list", async () => {
    mocks.create.mockResolvedValue({ id: "t1" });
    renderWithIntl(<TierListCreateForm />);
    expect(screen.getByRole("button", { name: "Armar tier list" })).toBeDisabled();
    await userEvent.type(screen.getByRole("searchbox", { name: "Artista" }), "metal");
    expect(mocks.search).toHaveBeenLastCalledWith("artist", "metal");
    await userEvent.click(screen.getByRole("button", { name: /Metallica/ }));
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Tier list de Metallica");
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(mocks.create).toHaveBeenCalledWith({ title: "Tier list de Metallica", artistId: ARTIST });
    expect(mocks.push).toHaveBeenCalledWith("/me/laminas/t1");
  });

  it("si falla, avisa y deja intentarlo de nuevo", async () => {
    mocks.create.mockRejectedValue(new Error("400"));
    renderWithIntl(<TierListCreateForm />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Artista" }), "metal");
    await userEvent.click(screen.getByRole("button", { name: /Metallica/ }));
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo armar");
    expect(screen.getByRole("button", { name: "Armar tier list" })).toBeEnabled();
  });
});
