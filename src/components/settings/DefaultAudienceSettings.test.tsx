import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { DefaultAudienceSettings } from "./DefaultAudienceSettings";

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number, message: string) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return { apiFetch: vi.fn(), refresh: vi.fn(), ApiError };
});

vi.mock("@/lib/api/client", () => ({ apiFetch: mocks.apiFetch, ApiError: mocks.ApiError }));
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

beforeEach(() => vi.clearAllMocks());

const profileWith = (defaultAudience: string | null) => ({ user: { defaultAudience } });
const bodyOfCall = (index = 0) => JSON.parse((mocks.apiFetch.mock.calls[index]![2] as RequestInit).body as string);

describe("DefaultAudienceSettings", () => {
  it("ofrece las cuatro opciones y aclara que solo afecta al contenido nuevo", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);

    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Privado/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Seguidores/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Público/ })).toBeInTheDocument();
    expect(screen.getByText(/No cambia lo que ya tenés/)).toBeInTheDocument();
  });

  it("aclara que las reseñas y los comentarios no dependen de la preferencia (son públicos)", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);
    expect(
      screen.getByText(/Las reseñas y los comentarios no dependen de esta preferencia/),
    ).toBeInTheDocument();
  });

  it("sin preferencia arranca en 'Según el tipo'", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).toBeChecked();
  });

  it("refleja la preferencia guardada", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience="followers" />);
    expect(screen.getByRole("radio", { name: /Seguidores/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).not.toBeChecked();
  });

  it("elegir una audiencia la guarda vía PATCH /api/me/profile", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(profileWith("public"));
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);

    await user.click(screen.getByRole("radio", { name: /Público/ }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [url, , init] = mocks.apiFetch.mock.calls[0]!;
    expect(url).toBe("/api/me/profile");
    expect((init as RequestInit).method).toBe("PATCH");
    expect(bodyOfCall()).toEqual({ defaultAudience: "public" });
    expect(await screen.findByText("Guardado")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Público/ })).toBeChecked();
  });

  it("volver a 'Según el tipo' envía null", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(profileWith(null));
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(screen.getByRole("radio", { name: /Según el tipo/ }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalled());
    expect(bodyOfCall()).toEqual({ defaultAudience: null });
    expect(screen.getByRole("radio", { name: /Según el tipo/ })).toBeChecked();
  });

  it("elegir la opción ya activa no hace ninguna petición", async () => {
    const user = userEvent.setup();
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(screen.getByRole("radio", { name: /Privado/ }));

    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it("ante un error muestra la alerta y conserva la elección anterior", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<DefaultAudienceSettings initialAudience="followers" />);

    await user.click(screen.getByRole("radio", { name: /Público/ }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Seguidores/ })).toBeChecked();
    expect(screen.queryByText("Guardado")).not.toBeInTheDocument();
  });
});

// --- Aplicar a lo existente (spec default-audience, "Acción «Aplicar a lo existente» en Ajustes")

const APPLY_URL = "/api/me/default-audience/apply";

function previewOf(overrides: Record<string, unknown> = {}) {
  return {
    audience: "private",
    favorites: 3,
    diary: 5,
    lists: 2,
    collection: 0,
    highlighted: { pinnedLists: 0, pinnedAlbumFavorites: 0, highlightedDiary: 0 },
    ...overrides,
  };
}

// Responde por URL/método: la vista previa (GET) y la aplicación (POST).
function mockApply(preview: unknown, result?: unknown) {
  mocks.apiFetch.mockImplementation(async (url: string, _schema: unknown, init?: RequestInit) => {
    if (url.startsWith(APPLY_URL) && init?.method === "POST") return result;
    if (url.startsWith(APPLY_URL)) return preview;
    throw new Error(`petición inesperada ${url}`);
  });
}

const applyButton = () => screen.getByRole("button", { name: "Aplicar a lo existente" });
const postCalls = () =>
  mocks.apiFetch.mock.calls.filter(([, , init]) => (init as RequestInit | undefined)?.method === "POST");

describe("DefaultAudienceSettings · aplicar a lo existente", () => {
  it("con 'Según el tipo' el botón está desactivado y lo explica", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);

    expect(applyButton()).toBeDisabled();
    expect(applyButton()).toHaveAccessibleDescription(/Elegí Privado, Seguidores o Público/);
  });

  it("con una audiencia elegida el botón está activo", () => {
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);
    expect(applyButton()).toBeEnabled();
  });

  it("elegir la preferencia no toca lo existente: solo hace el PATCH", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockResolvedValue(profileWith("public"));
    renderWithIntl(<DefaultAudienceSettings initialAudience={null} />);

    await user.click(screen.getByRole("radio", { name: /Público/ }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    expect(mocks.apiFetch.mock.calls[0]![0]).toBe("/api/me/profile");
  });

  it("pide la vista previa y abre la confirmación con los conteos, sin aplicar nada", async () => {
    const user = userEvent.setup();
    mockApply(previewOf());
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());

    const dialog = await screen.findByRole("dialog", { name: /Aplicar «Privado» a lo existente/ });
    expect(dialog).toHaveTextContent("3 favoritos, 5 entradas de diario, 2 listas");
    expect(dialog).not.toHaveTextContent("copia de colección");
    expect(mocks.apiFetch.mock.calls[0]![0]).toBe(`${APPLY_URL}?audience=private`);
    expect(postCalls()).toHaveLength(0);
  });

  it("avisa cuántos elementos fijados o destacados cambian, y que el diario destacado sigue visible", async () => {
    const user = userEvent.setup();
    mockApply(previewOf({ highlighted: { pinnedLists: 1, pinnedAlbumFavorites: 2, highlightedDiary: 3 } }));
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("1 lista fijada, 2 álbumes favoritos fijados, 3 entradas de diario destacadas");
    expect(dialog).toHaveTextContent("Las entradas de diario destacadas siguen visibles para cualquiera");
    expect(dialog).toHaveTextContent("dejarán de verse para quien quede fuera");
  });

  it("no avisa de destacados cuando no hay ninguno", async () => {
    const user = userEvent.setup();
    mockApply(previewOf());
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());

    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveTextContent("fijados o destacados");
  });

  it("al pasar a Público no avisa de que los fijados dejarán de verse", async () => {
    const user = userEvent.setup();
    mockApply(
      previewOf({ audience: "public", highlighted: { pinnedLists: 2, pinnedAlbumFavorites: 0, highlightedDiary: 0 } }),
    );
    renderWithIntl(<DefaultAudienceSettings initialAudience="public" />);

    await user.click(applyButton());

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("2 listas fijadas");
    expect(dialog).not.toHaveTextContent("dejarán de verse");
  });

  it("cancelar cierra la confirmación y no aplica nada", async () => {
    const user = userEvent.setup();
    mockApply(previewOf());
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("confirmar aplica la audiencia de la vista previa, informa el resultado y refresca", async () => {
    const user = userEvent.setup();
    mockApply(previewOf(), { audience: "private", favorites: 3, diary: 5, lists: 2, collection: 0 });
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());
    await user.click(await screen.findByRole("button", { name: "Aplicar" }));

    expect(
      await screen.findByText(/Listo: se actualizó la audiencia de 3 favoritos, 5 entradas de diario, 2 listas a «Privado»/),
    ).toBeInTheDocument();
    expect(postCalls()).toHaveLength(1);
    expect(postCalls()[0]![0]).toBe(APPLY_URL);
    expect(JSON.parse((postCalls()[0]![2] as RequestInit).body as string)).toEqual({ audience: "private" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("si todo ya tiene esa audiencia lo informa sin abrir la confirmación", async () => {
    const user = userEvent.setup();
    mockApply(previewOf({ favorites: 0, diary: 0, lists: 0, collection: 0 }));
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());

    expect(await screen.findByText(/Todo tu contenido ya tiene la audiencia «Privado»/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(postCalls()).toHaveLength(0);
  });

  it("un error en la vista previa muestra la alerta y no abre la confirmación", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockRejectedValue(new mocks.ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("un error al aplicar muestra la alerta y no informa de éxito ni refresca", async () => {
    const user = userEvent.setup();
    mocks.apiFetch.mockImplementation(async (url: string, _schema: unknown, init?: RequestInit) => {
      if (init?.method === "POST") throw new mocks.ApiError("INTERNAL_ERROR", 500, "x");
      if (url.startsWith(APPLY_URL)) return previewOf();
      throw new Error(`petición inesperada ${url}`);
    });
    renderWithIntl(<DefaultAudienceSettings initialAudience="private" />);

    await user.click(applyButton());
    await user.click(await screen.findByRole("button", { name: "Aplicar" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/Listo:/)).not.toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
