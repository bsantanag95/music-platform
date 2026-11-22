import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CommunityListsPage from "./page";

const mocks = vi.hoisted(() => ({
  resolveSession: vi.fn(),
  listFeaturedLists: vi.fn(),
  listPopularLists: vi.fn(),
  listsFromFollowing: vi.fn(),
  listDiscoverLists: vi.fn(),
  discoverCaminos: vi.fn(),
  getMostRecentEditedList: vi.fn(),
  getUserListDetail: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.resolveSession }));
vi.mock("@/services/camino/discovery", () => ({ discoverCaminos: mocks.discoverCaminos }));
vi.mock("@/services/home/home", () => ({ getMostRecentEditedList: mocks.getMostRecentEditedList }));
vi.mock("@/services/lists/lists", () => ({ getUserListDetail: mocks.getUserListDetail }));
vi.mock("@/services/lists/discovery", () => ({ listDiscoverLists: mocks.listDiscoverLists }));
vi.mock("@/services/lists/community", () => ({
  listFeaturedLists: mocks.listFeaturedLists,
  listPopularLists: mocks.listPopularLists,
  listsFromFollowing: mocks.listsFromFollowing,
}));
vi.mock("@/components/lists/ListsReader", () => ({
  ListsReader: (props: {
    mode: string;
    tabs?: { key: string; excludeIds?: string[]; caminos?: unknown[] }[];
    initialPreview: { id: string; items: unknown[] } | null;
  }) => (
    <div
      data-testid="reader"
      data-mode={props.mode}
      data-tabs={(props.tabs ?? []).map((tab) => tab.key).join(",")}
      data-exclude={(props.tabs ?? []).map((tab) => (tab.excludeIds ?? []).join("+")).join(",")}
      data-preview={props.initialPreview?.id ?? ""}
    />
  ),
}));
vi.mock("@/components/lists/ListsYourLine", () => ({
  ListsYourLine: ({ resume }: { resume: { id: string } | null }) => <div data-testid="your-line" data-resume={resume?.id ?? "sin-listas"} />,
}));
vi.mock("@/components/lists/ListsSignUpBand", () => ({
  ListsSignUpBand: ({ covers = [] }: { covers?: string[] }) => <div data-testid="band" data-covers={covers.join(",")} />,
  ListsBand: ({ title, primary }: { title: string; primary: { label: string } }) => (
    <div data-testid="empty-band">
      {title}
      {primary.label}
    </div>
  ),
}));
vi.mock("@/components/lists/FeaturedExhibit", () => ({
  FeaturedExhibit: ({ list, items, compact }: { list: { id: string }; items?: { id: string }[] | null; compact?: boolean }) => (
    <div data-testid={compact ? "featured-compact" : "featured-card"} data-id={list.id} data-items={items === null ? "null" : (items ?? []).length} />
  ),
}));
vi.mock("@/components/lists/CommunityListsToolbar", () => ({
  CommunityListsToolbar: () => <div data-testid="toolbar" />,
}));

const list = (id: string, username = "fran") => ({ id, owner: { username }, coverThumbs: [] as string[] });
const page = (lists: unknown[]) => ({ lists, page: 1, pageSize: 20, hasNext: false });
const camino = (id: string, kind = "standard") => ({ id, kind, owner: { username: "eli" }, coverThumbs: [] as string[] });

async function renderPage(searchParams: Record<string, string> = {}) {
  render(await CommunityListsPage({ searchParams: Promise.resolve(searchParams) }));
}

const reader = () => screen.getByTestId("reader");

describe("/lists (openspec: redesign-lists-phase2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listFeaturedLists.mockResolvedValue({ lists: [] });
    mocks.listPopularLists.mockResolvedValue(page([]));
    mocks.listsFromFollowing.mockResolvedValue(page([]));
    mocks.listDiscoverLists.mockResolvedValue(page([]));
    mocks.discoverCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 8, hasNext: false });
    mocks.getMostRecentEditedList.mockResolvedValue(null);
    mocks.getUserListDetail.mockResolvedValue({ items: [{ id: "i1" }] });
  });

  it("con sesión, el lector tiene las pestañas con contenido en orden: la gente que sigues primero y Para completar al final", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list("f1")] });
    mocks.listsFromFollowing.mockResolvedValue(page([list("s1")]));
    mocks.listPopularLists.mockResolvedValue(page([list("p1")]));
    mocks.listDiscoverLists.mockResolvedValue(page([list("r1")]));
    mocks.discoverCaminos.mockResolvedValue({ caminos: [camino("c1")], page: 1, pageSize: 8, hasNext: false });

    await renderPage();

    expect(screen.getByTestId("featured-card")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(reader().dataset.mode).toBe("showcase");
    expect(reader().dataset.tabs).toBe("from-following,popular,recent,to-complete");
    expect(mocks.discoverCaminos).toHaveBeenCalledWith({}, 1, 8);
  });

  it("las pestañas solo dejan fuera lo que ya está en Destacadas; entre ellas puede repetirse", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list("f1")] });
    mocks.listsFromFollowing.mockResolvedValue(page([list("s1")]));
    mocks.listPopularLists.mockResolvedValue(page([list("s1")]));
    mocks.listDiscoverLists.mockResolvedValue(page([list("s1")]));

    await renderPage();

    expect(reader().dataset.exclude).toBe("f1,f1,f1");
  });

  it("una pestaña que solo tendría la destacada no aparece", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list("f1")] });
    mocks.listPopularLists.mockResolvedValue(page([list("f1")]));
    mocks.listDiscoverLists.mockResolvedValue(page([list("r1")]));

    await renderPage();

    expect(reader().dataset.tabs).toBe("recent");
  });

  it("resuelve en el servidor la vista previa de la primera lista de la primera pestaña, con el usuario del dueño", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listPopularLists.mockResolvedValue(page([list("p1", "dario"), list("p2")]));

    await renderPage();

    expect(mocks.getUserListDetail).toHaveBeenCalledWith("dario", "p1", null);
    expect(reader().dataset.preview).toBe("p1");
  });

  it("si la vista previa inicial falla, la página se muestra igual y el cliente la pedirá", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listDiscoverLists.mockResolvedValue(page([list("r1")]));
    mocks.getUserListDetail.mockRejectedValue(new Error("boom"));

    await renderPage();

    expect(reader().dataset.preview).toBe("");
  });

  it("un recorrido propio de Para completar no pide vista previa", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.discoverCaminos.mockResolvedValue({ caminos: [camino("c1", "custom_journey")], page: 1, pageSize: 8, hasNext: false });

    await renderPage();

    expect(reader().dataset.tabs).toBe("to-complete");
    expect(mocks.getUserListDetail).not.toHaveBeenCalled();
  });

  it("con sesión: 'Tus listas' bajo la entrada, 'Crear lista' y sin banda; sin listas propias invita a crear", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.listDiscoverLists.mockResolvedValue(page([list("r1")]));
    mocks.getMostRecentEditedList.mockResolvedValue({ id: "mine" });

    await renderPage();

    expect(screen.getByTestId("your-line").dataset.resume).toBe("mine");
    expect(screen.getByText("createList")).toBeInTheDocument();
    expect(screen.queryByTestId("band")).not.toBeInTheDocument();
  });

  it("sin sesión: banda para crear cuenta, sin 'Tus listas', sin consultar la lista propia ni la gente que sigue", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listDiscoverLists.mockResolvedValue(page([list("r1")]));

    await renderPage();

    expect(screen.getByTestId("band")).toBeInTheDocument();
    expect(screen.queryByTestId("your-line")).not.toBeInTheDocument();
    expect(screen.queryByText("createList")).not.toBeInTheDocument();
    expect(mocks.getMostRecentEditedList).not.toHaveBeenCalled();
    expect(mocks.listsFromFollowing).not.toHaveBeenCalled();
  });

  it("muestra el estado vacío global con su acción: iniciar sesión sin sesión, crear la primera con sesión (D10)", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    await renderPage();
    expect(screen.getByTestId("empty-band")).toHaveTextContent("community.emptyTitle");
    expect(screen.getByTestId("empty-band")).toHaveTextContent("community.emptySignedOutAction");
    expect(screen.queryByTestId("reader")).not.toBeInTheDocument();
  });

  it("'Para completar' sola no evita el estado vacío global", async () => {
    mocks.resolveSession.mockResolvedValue({ user: { id: "u1" } });
    mocks.discoverCaminos.mockResolvedValue({ caminos: [camino("c1")], page: 1, pageSize: 8, hasNext: false });

    await renderPage();

    expect(screen.getByTestId("empty-band")).toHaveTextContent("community.emptyTitle");
    expect(screen.getByTestId("empty-band")).toHaveTextContent("community.emptyAction");
  });

  it("con filtros usa el lector en modo explorar, sin Destacadas, pestañas ni banda", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listDiscoverLists.mockResolvedValue(page([list("x1", "bea")]));

    await renderPage({ q: "rock", type: "artist" });

    expect(reader().dataset.mode).toBe("explore");
    expect(reader().dataset.preview).toBe("x1");
    expect(mocks.listFeaturedLists).not.toHaveBeenCalled();
    expect(screen.queryByTestId("featured-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("band")).not.toBeInTheDocument();
    expect(mocks.listDiscoverLists).toHaveBeenCalledWith(null, 1, 20, expect.objectContaining({ q: "rock", entityType: "artist" }));
  });

  it("ignora valores de filtro inválidos y mantiene la vitrina", async () => {
    mocks.resolveSession.mockResolvedValue(null);
    mocks.listDiscoverLists.mockResolvedValue(page([list("r1")]));

    await renderPage({ type: "nope", sort: "nope" });

    expect(reader().dataset.mode).toBe("showcase");
  });
});

describe("/lists: exhibidor, banda y estados (openspec: redesign-lists-phase3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listPopularLists.mockResolvedValue(page([]));
    mocks.listsFromFollowing.mockResolvedValue(page([]));
    mocks.discoverCaminos.mockResolvedValue({ caminos: [], page: 1, pageSize: 8, hasNext: false });
    mocks.getMostRecentEditedList.mockResolvedValue(null);
    mocks.resolveSession.mockResolvedValue(null);
  });

  it("la primera destacada es el exhibidor con sus elementos; las demás, compactas", async () => {
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list("f1", "exploracion"), list("f2", "exploracion"), list("f3", "exploracion")] });
    mocks.listDiscoverLists.mockResolvedValue(page([]));
    mocks.getUserListDetail.mockResolvedValue({ items: [{ id: "i1" }, { id: "i2" }] });

    await renderPage();

    expect(mocks.getUserListDetail).toHaveBeenCalledWith("exploracion", "f1", null);
    expect(screen.getByTestId("featured-card")).toHaveAttribute("data-items", "2");
    expect(screen.getAllByTestId("featured-compact").map((n) => n.dataset.id)).toEqual(["f2", "f3"]);
  });

  it("si los elementos de la destacada fallan, el exhibidor se muestra igual sin ellos", async () => {
    mocks.listFeaturedLists.mockResolvedValue({ lists: [list("f1", "exploracion")] });
    mocks.listDiscoverLists.mockResolvedValue(page([]));
    mocks.getUserListDetail.mockRejectedValue(new Error("boom"));

    await renderPage();

    expect(screen.getByTestId("featured-card")).toHaveAttribute("data-items", "null");
  });

  it("la banda lleva hasta tres carátulas de las listas de la página", async () => {
    mocks.listFeaturedLists.mockResolvedValue({ lists: [] });
    mocks.listDiscoverLists.mockResolvedValue(
      page([
        { ...list("r1"), coverThumbs: ["a.jpg", "x.jpg"] },
        { ...list("r2"), coverThumbs: [] },
        { ...list("r3"), coverThumbs: ["b.jpg"] },
        { ...list("r4"), coverThumbs: ["c.jpg"] },
        { ...list("r5"), coverThumbs: ["d.jpg"] },
      ]),
    );
    mocks.getUserListDetail.mockResolvedValue({ items: [] });

    await renderPage();

    expect(screen.getByTestId("band")).toHaveAttribute("data-covers", "a.jpg,b.jpg,c.jpg");
  });

  it("el estado vacío global usa la forma de la banda, y entonces no hay banda de invitación aparte", async () => {
    mocks.listFeaturedLists.mockResolvedValue({ lists: [] });
    mocks.listDiscoverLists.mockResolvedValue(page([]));

    await renderPage();

    expect(screen.getByTestId("empty-band")).toHaveTextContent("community.emptyTitle");
    expect(screen.queryByTestId("band")).not.toBeInTheDocument();
  });
});
