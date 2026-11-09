import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ save: vi.fn(), clear: vi.fn(), hide: vi.fn(), show: vi.fn(), refresh: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/api/year", () => ({ saveYearTop: mocks.save, clearYearTop: mocks.clear, hideYearDisc: mocks.hide, showYearDisc: mocks.show }));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span /> }));

import { YearHiddenList, YearHideButton, YearTopEditor } from "./YearCuration";

const disc = (n: number) => ({ id: `d${n}`, title: `Disco ${n}`, artistName: "Banda", coverThumbUrl: null });
const choice = (n: number, score: { stars: number; detailedScore: number | null } | null = null) => ({ ...disc(n), listens: n, score });

beforeEach(() => {
  vi.clearAllMocks();
  for (const mock of [mocks.save, mocks.clear, mocks.hide, mocks.show]) mock.mockResolvedValue(null);
});

describe("YearTopEditor", () => {
  const choices = [choice(1, { stars: 5, detailedScore: 96 }), choice(2), choice(3), choice(4), choice(5), choice(6), choice(7)];

  it("sube un disco con el teclado y guarda el orden", async () => {
    renderWithIntl(<YearTopEditor year={2026} top={[disc(1), disc(2), disc(3)]} custom={false} choices={choices} />);
    expect(screen.getByRole("button", { name: "Subir Disco 1" })).toBeDisabled();
    screen.getByRole("button", { name: "Subir Disco 3" }).focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(2026, ["d1", "d3", "d2"]));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("cambia el Top 5 eligiendo hasta cinco, con la nota solo acá", async () => {
    renderWithIntl(<YearTopEditor year={2026} top={[disc(1), disc(2), disc(3), disc(4), disc(5)]} custom={false} choices={choices} />);
    expect(screen.getByText(/Armado con tus discos del año mejor valorados/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cambiar" }));
    expect(screen.getByText(/96/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Disco 6/ })).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox", { name: /Disco 2/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Disco 6/ }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(2026, ["d1", "d3", "d4", "d5", "d6"]));
  });

  it("elegido, ofrece volver al automático", async () => {
    renderWithIntl(<YearTopEditor year={2026} top={[disc(1)]} custom choices={choices} />);
    await userEvent.click(screen.getByRole("button", { name: "Volver al automático" }));
    await waitFor(() => expect(mocks.clear).toHaveBeenCalledWith(2026));
  });

  it("si falla, avisa", async () => {
    mocks.clear.mockRejectedValue(new Error("400"));
    renderWithIntl(<YearTopEditor year={2026} top={[disc(1)]} custom choices={choices} />);
    await userEvent.click(screen.getByRole("button", { name: "Volver al automático" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar");
  });
});

describe("ocultar y mostrar", () => {
  it("oculta un disco del año", async () => {
    renderWithIntl(<YearHideButton year={2026} disc={disc(4)} />);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar Disco 4 del año" }));
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledWith(2026, "d4"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("lista los ocultos y los vuelve a mostrar; sin ocultos, nada", async () => {
    const { container, unmount } = renderWithIntl(<YearHiddenList year={2026} hidden={[]} />);
    expect(container).toBeEmptyDOMElement();
    unmount();
    renderWithIntl(<YearHiddenList year={2026} hidden={[disc(8)]} />);
    expect(screen.getByRole("heading", { name: "1 disco oculto" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mostrar" }));
    await waitFor(() => expect(mocks.show).toHaveBeenCalledWith(2026, "d8"));
  });
});
