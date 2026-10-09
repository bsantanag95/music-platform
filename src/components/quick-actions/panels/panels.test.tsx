import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ApiError } from "@/lib/api/client";
import { RatePanel } from "./RatePanel";
import { MarkPanel } from "./MarkPanel";
import { NewListPanel } from "./NewListPanel";
import { AddToListStep } from "./AddToListStep";
import { albumHref } from "@/lib/catalog-links";
import type { PickTarget } from "../types";

const mocks = vi.hoisted(() => ({
  getTargetMarks: vi.fn(),
  saveRating: vi.fn(),
  toggleFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  toggleWantToListen: vi.fn(),
  removeFromWantToListen: vi.fn(),
  createList: vi.fn(),
  addToListPanel: vi.fn(),
}));

vi.mock("@/lib/api/marks", () => ({ getTargetMarks: mocks.getTargetMarks }));
vi.mock("@/lib/api/social", () => ({ saveRating: mocks.saveRating }));
vi.mock("@/lib/api/favorites", () => ({
  toggleFavorite: mocks.toggleFavorite,
  removeFavorite: mocks.removeFavorite,
}));
vi.mock("@/lib/api/want-to-listen", () => ({
  toggleWantToListen: mocks.toggleWantToListen,
  removeFromWantToListen: mocks.removeFromWantToListen,
}));
vi.mock("@/lib/api/lists", () => ({ createList: mocks.createList }));
vi.mock("@/components/lists/AddToListPanel", () => ({
  AddToListPanel: (props: { target: { type: string; id: string } }) => {
    mocks.addToListPanel(props);
    return <div data-testid="add-to-list-panel" />;
  },
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}));

const album: PickTarget = {
  type: "release-group",
  id: "a1b2c3d4-0000-4000-8000-000000000010",
  title: "Dr. Feelgood",
  subtitle: "Mötley Crüe",
};
const song: PickTarget = {
  type: "recording",
  id: "a1b2c3d4-0000-4000-8000-000000000030",
  title: "Time",
  subtitle: "Pink Floyd",
};
const noMarks = { favorite: false, pending: false, stars: null, detailedScore: null };

beforeEach(() => vi.clearAllMocks());

describe("RatePanel", () => {
  it("guarda al tocar una estrella y enlaza a la página del álbum", async () => {
    mocks.getTargetMarks.mockResolvedValue(noMarks);
    mocks.saveRating.mockResolvedValue({});
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);

    fireEvent.click(await screen.findByRole("radio", { name: "4,0 estrellas" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", album.id, { stars: 4 }));
    expect(await screen.findByText("Valoración guardada")).toBeInTheDocument();
    expect(screen.getByText(/★ 4,0 ·/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ampliar en la página" })).toHaveAttribute(
      "href",
      albumHref(album.subtitle, album.title, album.id),
    );
  });

  it("precarga las estrellas de una valoración previa", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 3.5 });
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);
    expect(await screen.findByRole("radio", { name: "3,5 estrellas" })).toBeChecked();
    expect(mocks.saveRating).not.toHaveBeenCalled();
  });

  it("conserva el puntaje detallado cuando sigue siendo coherente", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 4, detailedScore: 81 });
    mocks.saveRating.mockResolvedValue({});
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);

    fireEvent.click(await screen.findByRole("radio", { name: "4,5 estrellas" }));

    await waitFor(() =>
      expect(mocks.saveRating).toHaveBeenCalledWith("release-group", album.id, { stars: 4.5, detailedScore: 81 }),
    );
  });

  it("al volverse incoherente suelta el puntaje y avisa", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 3, detailedScore: 55 });
    mocks.saveRating.mockResolvedValue({});
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);

    fireEvent.click(await screen.findByRole("radio", { name: "5,0 estrellas" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", album.id, { stars: 5 }));
    expect(await screen.findByText(/Se quitó tu puntuación 55/)).toBeInTheDocument();
  });

  it("puntuar con el deslizador envía solo el puntaje y muestra las estrellas que deriva el servidor", async () => {
    mocks.getTargetMarks
      .mockResolvedValueOnce(noMarks)
      .mockResolvedValueOnce({ ...noMarks, stars: 4.5, detailedScore: 90 });
    mocks.saveRating.mockResolvedValue({});
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);

    const slider = await screen.findByRole("slider");
    expect(screen.getByText("—/100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    fireEvent.change(slider, { target: { value: "90" } });
    expect(screen.getByText("90/100")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", album.id, { detailedScore: 90 }));
    expect(await screen.findByRole("radio", { name: "4,5 estrellas" })).toBeChecked();
    expect(mocks.saveRating).toHaveBeenCalledTimes(1);
  });

  it("precarga la puntuación vigente y limita el deslizador al tramo de las estrellas", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 4, detailedScore: 75 });
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);
    const slider = await screen.findByRole("slider");
    expect(slider).toHaveValue("75");
    expect(slider).toHaveAttribute("min", "71");
    expect(slider).toHaveAttribute("max", "80");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("sin estrellas el deslizador va de 1 a 100", async () => {
    mocks.getTargetMarks.mockResolvedValue(noMarks);
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);
    const slider = await screen.findByRole("slider");
    expect(slider).toHaveAttribute("min", "1");
    expect(slider).toHaveAttribute("max", "100");
  });

  it("los botones − y + ajustan de a 1 y Guardar queda deshabilitado si no cambia", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 5, detailedScore: 95 });
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);
    await screen.findByRole("slider");
    await userEvent.click(screen.getByRole("button", { name: "Restar 1" }));
    expect(screen.getByText("94/100")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Sumar 1" }));
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    expect(mocks.saveRating).not.toHaveBeenCalled();
  });

  it("si guardar el puntaje falla restaura el valor anterior", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 5, detailedScore: 95 });
    mocks.saveRating.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);
    const slider = await screen.findByRole("slider");

    fireEvent.change(slider, { target: { value: "93" } });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
    expect(screen.getByText("95/100")).toBeInTheDocument();
  });

  it("si guardar falla restaura las estrellas y muestra el error", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, stars: 2 });
    mocks.saveRating.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<RatePanel target={album} onReset={() => {}} onNavigate={() => {}} />);

    fireEvent.click(await screen.findByRole("radio", { name: "4,0 estrellas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
    expect(screen.getByRole("radio", { name: "2,0 estrellas" })).toBeChecked();
  });
});

describe("MarkPanel", () => {
  it("favorito sin marca previa: lo agrega y ofrece Deshacer", async () => {
    mocks.getTargetMarks.mockResolvedValue(noMarks);
    mocks.toggleFavorite.mockResolvedValue({ id: "f1" });
    mocks.removeFavorite.mockResolvedValue(null);
    renderWithIntl(<MarkPanel kind="favorite" target={album} onReset={() => {}} />);

    expect(await screen.findByText("Añadido a tus favoritos")).toBeInTheDocument();
    expect(mocks.toggleFavorite).toHaveBeenCalledTimes(1);
    expect(mocks.toggleFavorite).toHaveBeenCalledWith({ type: "release-group", id: album.id });

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(mocks.removeFavorite).toHaveBeenCalledWith({ type: "release-group", id: album.id });
    expect(await screen.findByText("Quitado de tus favoritos")).toBeInTheDocument();
  });

  it("favorito ya marcado: informa y NO llama a toggle (no lo quita por accidente)", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, favorite: true });
    mocks.removeFavorite.mockResolvedValue(null);
    renderWithIntl(<MarkPanel kind="favorite" target={album} onReset={() => {}} />);

    expect(await screen.findByText("Ya estaba en tus favoritos")).toBeInTheDocument();
    expect(mocks.toggleFavorite).not.toHaveBeenCalled();
    expect(mocks.removeFavorite).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(mocks.removeFavorite).toHaveBeenCalledTimes(1);
  });

  it("Pendiente de un artista: lo agrega y ofrece Deshacer", async () => {
    mocks.getTargetMarks.mockResolvedValue(noMarks);
    mocks.toggleWantToListen.mockResolvedValue({ id: "w1" });
    mocks.removeFromWantToListen.mockResolvedValue(null);
    const artist: PickTarget = { type: "artist", id: "a1b2c3d4-0000-4000-8000-000000000050", title: "Pink Floyd", subtitle: null };
    renderWithIntl(<MarkPanel kind="pending" target={artist} onReset={() => {}} />);

    expect(await screen.findByText("Añadido a tus Pendientes")).toBeInTheDocument();
    expect(mocks.toggleWantToListen).toHaveBeenCalledWith({ type: "artist", id: artist.id });

    await userEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(mocks.removeFromWantToListen).toHaveBeenCalledWith({ type: "artist", id: artist.id });
  });

  it("Pendiente ya marcado no alterna", async () => {
    mocks.getTargetMarks.mockResolvedValue({ ...noMarks, pending: true });
    renderWithIntl(<MarkPanel kind="pending" target={album} onReset={() => {}} />);
    expect(await screen.findByText("Ya estaba en tus Pendientes")).toBeInTheDocument();
    expect(mocks.toggleWantToListen).not.toHaveBeenCalled();
  });

  it("si la lectura de marcas falla no marca nada y muestra el error", async () => {
    mocks.getTargetMarks.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "x"));
    renderWithIntl(<MarkPanel kind="favorite" target={song} onReset={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos guardar");
    expect(mocks.toggleFavorite).not.toHaveBeenCalled();
  });

  it("sin sesión ofrece iniciar sesión", async () => {
    mocks.getTargetMarks.mockRejectedValue(new ApiError("AUTH_REQUIRED", 401, "x"));
    renderWithIntl(<MarkPanel kind="favorite" target={album} onReset={() => {}} />);
    expect(await screen.findByRole("link", { name: "Iniciar sesión para continuar" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
  });
});

describe("AddToListStep", () => {
  it("monta el panel de listas con el tipo del objetivo", () => {
    renderWithIntl(<AddToListStep target={song} onReset={() => {}} />);
    expect(screen.getByTestId("add-to-list-panel")).toBeInTheDocument();
    expect(mocks.addToListPanel).toHaveBeenCalledWith(
      expect.objectContaining({ target: { type: "recording", id: song.id } }),
    );
  });
});

describe("NewListPanel", () => {
  it("el campo del título no ofrece autocompletar del navegador", () => {
    renderWithIntl(<NewListPanel onAddItems={() => {}} onNavigate={() => {}} />);
    expect(screen.getByLabelText("Nombre de la lista")).toHaveAttribute("autocomplete", "off");
  });

  it("sin título no crea la lista y lo indica", async () => {
    renderWithIntl(<NewListPanel onAddItems={() => {}} onNavigate={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));
    expect(screen.getByText("El título es obligatorio")).toBeInTheDocument();
    expect(mocks.createList).not.toHaveBeenCalled();
  });

  it("crea la lista SIN audiencia para que aplique la audiencia por defecto", async () => {
    mocks.createList.mockResolvedValue({ id: "l1", title: "Para el auto", entityType: "release-group" });
    renderWithIntl(<NewListPanel onAddItems={() => {}} onNavigate={() => {}} />);

    await userEvent.type(screen.getByLabelText("Nombre de la lista"), "Para el auto");
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));

    expect(mocks.createList).toHaveBeenCalledTimes(1);
    const input = mocks.createList.mock.calls[0]![0];
    expect(input).toEqual({ entityType: "release-group", title: "Para el auto" });
    expect("audience" in input).toBe(false);
    expect(await screen.findByText("Lista creada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver lista" })).toHaveAttribute("href", "/me/lists/l1");
  });

  it("respeta el tipo elegido", async () => {
    mocks.createList.mockResolvedValue({ id: "l2", title: "Mis artistas", entityType: "artist" });
    renderWithIntl(<NewListPanel onAddItems={() => {}} onNavigate={() => {}} />);

    await userEvent.click(screen.getByRole("radio", { name: "Artistas" }));
    await userEvent.type(screen.getByLabelText("Nombre de la lista"), "Mis artistas");
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));

    expect(mocks.createList).toHaveBeenCalledWith({ entityType: "artist", title: "Mis artistas" });
  });

  it("'Agregar a esta lista' entrega el tipo de la lista creada", async () => {
    mocks.createList.mockResolvedValue({ id: "l1", title: "Para el auto", entityType: "recording" });
    const onAddItems = vi.fn();
    renderWithIntl(<NewListPanel onAddItems={onAddItems} onNavigate={() => {}} />);

    await userEvent.click(screen.getByRole("radio", { name: "Canciones" }));
    await userEvent.type(screen.getByLabelText("Nombre de la lista"), "Para el auto");
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));
    await userEvent.click(await screen.findByRole("button", { name: "Agregar a esta lista" }));

    expect(onAddItems).toHaveBeenCalledWith("recording");
  });

  it("un error del servidor se muestra sin el mensaje crudo", async () => {
    mocks.createList.mockRejectedValue(new ApiError("INTERNAL_ERROR", 500, "boom interno"));
    renderWithIntl(<NewListPanel onAddItems={() => {}} onNavigate={() => {}} />);
    await userEvent.type(screen.getByLabelText("Nombre de la lista"), "X");
    await userEvent.click(screen.getByRole("button", { name: "Crear lista" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No pudimos guardar");
    expect(alert).not.toHaveTextContent("boom interno");
  });
});
