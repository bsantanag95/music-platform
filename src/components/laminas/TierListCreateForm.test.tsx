import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ create: vi.fn(), push: vi.fn(), search: vi.fn(), source: vi.fn(), setSource: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/api/laminas", () => ({ createTierList: mocks.create }));
vi.mock("@/components/quick-actions/use-target-search", () => ({ useTargetSearch: mocks.search }));
vi.mock("./use-lamina-source", () => ({ useLaminaSource: mocks.source }));
vi.mock("./LaminaSourcePanel", () => ({ LaminaSourcePanel: () => <div>vista previa</div> }));

import { TierListCreateForm } from "./TierListCreateForm";

const ARTIST = "30000000-0000-4000-8000-000000000001";
const ALBUM = "40000000-0000-4000-8000-000000000001";
const SONG = (n: number) => `50000000-0000-4000-8000-00000000000${n}`;

const preview = (over = {}) => ({
  source: "manual",
  setSource: mocks.setSource,
  selected: [],
  labels: {},
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.create.mockResolvedValue({ id: "t1" });
  mocks.source.mockReturnValue(preview());
  mocks.search.mockImplementation((type: string, query: string) => ({
    candidates: !query
      ? []
      : type === "artist"
        ? [{ type: "artist", id: ARTIST, title: "Black Sabbath", subtitle: "Grupo" }]
        : [{ type: "release-group", id: ALBUM, title: "Paranoid", subtitle: "Black Sabbath", year: 1970 }],
    searchable: query.length >= 2,
  }));
});

describe("TierListCreateForm", () => {
  it("de discos desde la discografía de un artista, con el título sugerido", async () => {
    renderWithIntl(<TierListCreateForm />);
    expect(mocks.source).toHaveBeenCalledWith(expect.objectContaining({ slots: 50, limit: 50 }));
    expect(screen.getByRole("button", { name: "Armar tier list" })).toBeDisabled();
    await userEvent.type(screen.getByRole("searchbox", { name: "Artista" }), "black");
    expect(mocks.search).toHaveBeenLastCalledWith("artist", "black");
    await userEvent.click(screen.getByRole("button", { name: /Black Sabbath/ }));
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Tier list de Black Sabbath");
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(mocks.create).toHaveBeenCalledWith({ title: "Tier list de Black Sabbath", entityType: "release-group", source: { type: "discography", artistId: ARTIST } });
    expect(mocks.push).toHaveBeenCalledWith("/me/cards/t1");
  });

  it("de canciones desde un disco", async () => {
    renderWithIntl(<TierListCreateForm />);
    await userEvent.click(screen.getByRole("button", { name: "Canciones" }));
    expect(screen.getByRole("button", { name: "Canciones de un disco" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.type(screen.getByRole("searchbox", { name: "Disco" }), "paran");
    expect(mocks.search).toHaveBeenLastCalledWith("album", "paran");
    await userEvent.click(screen.getByRole("button", { name: /Paranoid/ }));
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Las canciones de Paranoid");
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(mocks.create).toHaveBeenCalledWith({ title: "Las canciones de Paranoid", entityType: "recording", source: { type: "album", releaseGroupId: ALBUM } });
  });

  it("de canciones desde tus valoraciones con el filtro de un artista: manda lo elegido", async () => {
    renderWithIntl(<TierListCreateForm />);
    await userEvent.click(screen.getByRole("button", { name: "Canciones" }));
    mocks.source.mockReturnValue(
      preview({
        source: "ratings",
        labels: { artist: "Ozzy Osbourne" },
        selected: [{ target: { id: SONG(1) } }, { target: { id: SONG(2) } }],
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Mis valoraciones" }));
    expect(mocks.setSource).toHaveBeenLastCalledWith("ratings");
    expect(screen.getByText("vista previa")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Mis canciones de Ozzy Osbourne");
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(mocks.create).toHaveBeenCalledWith({
      title: "Mis canciones de Ozzy Osbourne",
      entityType: "recording",
      source: { type: "picked", targetIds: [SONG(1), SONG(2)] },
    });
  });

  it("una lista sin nada elegido no se puede armar", async () => {
    renderWithIntl(<TierListCreateForm />);
    mocks.source.mockReturnValue(preview({ source: "list", labels: { listTitle: "Viaje" }, selected: [] }));
    await userEvent.click(screen.getByRole("button", { name: "Una lista" }));
    expect(mocks.setSource).toHaveBeenLastCalledWith("list");
    expect(screen.getByRole("button", { name: "Armar tier list" })).toBeDisabled();
  });

  it("si falla, avisa y deja intentarlo de nuevo", async () => {
    mocks.create.mockRejectedValue(new Error("400"));
    renderWithIntl(<TierListCreateForm />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Artista" }), "black");
    await userEvent.click(screen.getByRole("button", { name: /Black Sabbath/ }));
    await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo armar");
    expect(screen.getByRole("button", { name: "Armar tier list" })).toBeEnabled();
  });

  describe("Arma la tuya", () => {
    const inspiration = (over = {}) => ({
      id: "60000000-0000-4000-8000-000000000001",
      title: "Lo mejor de Sabbath",
      entityType: "release-group" as const,
      itemCount: 12,
      labels: ["Obra maestra", "A", "B", "C", "D", "E"],
      customLabels: true,
      ownerUsername: "ana",
      ...over,
    });

    it("arranca con la fuente de esa tier list, su título y un resumen, sin sus ítems", async () => {
      renderWithIntl(<TierListCreateForm inspiration={inspiration()} />);
      expect(screen.getByRole("button", { name: "Como la de @ana" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText(/^12 discos de su tier list/)).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "Título" })).toHaveValue("Lo mejor de Sabbath");
      const copy = screen.getByRole("checkbox", { name: /Usar sus etiquetas/ });
      expect(copy).not.toBeChecked();
      await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
      expect(mocks.create).toHaveBeenCalledWith({
        title: "Lo mejor de Sabbath",
        entityType: "release-group",
        source: { type: "lamina", id: inspiration().id, copyLabels: false },
      });
    });

    it("copia sus etiquetas solo si se marca", async () => {
      renderWithIntl(<TierListCreateForm inspiration={inspiration()} />);
      await userEvent.click(screen.getByRole("checkbox", { name: /Usar sus etiquetas/ }));
      await userEvent.click(screen.getByRole("button", { name: "Armar tier list" }));
      expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ source: expect.objectContaining({ copyLabels: true }) }));
    });

    it("sin etiquetas propias no ofrece copiarlas", () => {
      renderWithIntl(<TierListCreateForm inspiration={inspiration({ customLabels: false, labels: ["S", "A", "B", "C", "D", "E"] })} />);
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("de canciones, cuenta canciones; con el otro tipo, la fuente no aparece", async () => {
      renderWithIntl(<TierListCreateForm inspiration={inspiration({ entityType: "recording" })} />);
      expect(screen.getByText(/^12 canciones de su tier list/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Discos" }));
      expect(screen.queryByRole("button", { name: "Como la de @ana" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Discografía de un artista" })).toHaveAttribute("aria-pressed", "true");
    });
  });
});
