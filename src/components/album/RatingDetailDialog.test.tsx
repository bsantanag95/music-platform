import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { RatingDetailDialog } from "./RatingDetailDialog";

const mocks = vi.hoisted(() => ({
  saveRating: vi.fn(),
  getRatings: vi.fn(),
  deleteRating: vi.fn(),
  highlightRating: vi.fn(),
  unhighlightRating: vi.fn(),
}));
vi.mock("@/lib/api/social", () => mocks);

const detail = catalogEs.album.relation.detail;
const RG = "550e8400-e29b-41d4-a716-446655440000";
const own = {
  id: "550e8400-e29b-41d4-a716-446655440009",
  stars: 4,
  detailedScore: null as number | null,
  createdAt: "",
  updatedAt: "",
};
const empty = { own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } };

function renderDialog(options: { stars?: number; detailedScore?: number | null; isHighlighted?: boolean; noRating?: boolean } = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  const ownValue = options.noRating
    ? undefined
    : {
        ...own,
        stars: options.stars ?? own.stars,
        detailedScore: options.detailedScore === undefined ? null : options.detailedScore,
        isHighlighted: options.isHighlighted,
      };
  renderWithIntl(
    <RatingDetailDialog open onClose={onClose} target={{ type: "release-group", id: RG }} own={ownValue} onChange={onChange} />,
  );
  return { onChange, onClose };
}

const slider = () => screen.getByRole("slider");
const save = () => screen.getByRole("button", { name: detail.save });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRatings.mockResolvedValue(empty);
});

// openspec: refine-detailed-score-dialog.
describe("RatingDetailDialog", () => {
  it("con estrellas, el deslizador se limita a su tramo y muestra las estrellas vigentes", () => {
    renderDialog();
    expect(slider()).toHaveAttribute("min", "71");
    expect(slider()).toHaveAttribute("max", "80");
    expect(screen.getByText("4,0★ · 71–80")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4,0 estrellas" })).toBeInTheDocument();
    expect(screen.getByText(detail.rangeHint)).toBeInTheDocument();
  });

  it("sin elegir un valor muestra —/100 y no permite guardar", () => {
    renderDialog();
    expect(screen.getByText("—/100")).toBeInTheDocument();
    expect(slider()).toHaveAttribute("aria-valuetext", detail.valueTextEmpty);
    expect(slider()).toHaveAttribute("data-chosen", "false");
    expect(slider()).toHaveClass("opacity-40");
    expect(save()).toBeDisabled();

    fireEvent.change(slider(), { target: { value: "78" } });
    expect(slider()).toHaveAttribute("data-chosen", "true");
    expect(slider()).not.toHaveClass("opacity-40");
  });

  it("guarda solo el puntaje elegido dentro del tramo", async () => {
    mocks.saveRating.mockResolvedValue({});
    const { onChange, onClose } = renderDialog();
    fireEvent.change(slider(), { target: { value: "78" } });
    expect(screen.getByText("78/100")).toBeInTheDocument();
    expect(slider()).toHaveAttribute("aria-valuetext", "78 de 100, 4,0 estrellas");
    fireEvent.click(save());

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { detailedScore: 78 }));
    expect(onChange).toHaveBeenCalledWith(empty);
    expect(onClose).toHaveBeenCalled();
  });

  it("tocar el deslizador sin moverlo elige el valor del centro", () => {
    renderDialog();
    fireEvent.click(slider());
    expect(screen.getByText("76/100")).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("con el puntaje vigente, guardar se habilita solo al cambiarlo", () => {
    renderDialog({ detailedScore: 75 });
    expect(screen.getByText("75/100")).toBeInTheDocument();
    expect(save()).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: detail.increase }));
    expect(screen.getByText("76/100")).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it("sin estrellas va de 1 a 100 y las estrellas se llenan en vivo", async () => {
    mocks.saveRating.mockResolvedValue({});
    renderDialog({ noRating: true });
    expect(slider()).toHaveAttribute("min", "1");
    expect(slider()).toHaveAttribute("max", "100");
    expect(screen.getByRole("img", { name: detail.noStarsYet })).toBeInTheDocument();

    fireEvent.change(slider(), { target: { value: "86" } });
    expect(screen.getByRole("img", { name: "4,5 estrellas" })).toBeInTheDocument();
    fireEvent.click(save());
    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { detailedScore: 86 }));
  });

  it("− y + ajustan de a uno, parten del centro y se detienen en los extremos", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: detail.increase }));
    expect(screen.getByText("77/100")).toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: "80" } });
    expect(screen.getByRole("button", { name: detail.increase })).toBeDisabled();
    fireEvent.change(slider(), { target: { value: "71" } });
    expect(screen.getByRole("button", { name: detail.decrease })).toBeDisabled();
  });

  it("Re Pág y Av Pág mueven de a 10 dentro del rango", () => {
    renderDialog({ noRating: true });
    fireEvent.change(slider(), { target: { value: "50" } });
    fireEvent.keyDown(slider(), { key: "PageUp" });
    expect(screen.getByText("60/100")).toBeInTheDocument();
    fireEvent.keyDown(slider(), { key: "PageDown" });
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(screen.getByText("40/100")).toBeInTheDocument();
    fireEvent.change(slider(), { target: { value: "95" } });
    fireEvent.keyDown(slider(), { key: "PageUp" });
    expect(screen.getByText("100/100")).toBeInTheDocument();
  });

  it("la ayuda se abre y se cierra, con el tramo vigente resaltado", () => {
    renderDialog();
    const toggle = screen.getByRole("button", { name: detail.helpToggle });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(detail.helpIntro)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(detail.helpIntro)).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(11);
    const current = screen.getAllByRole("row").find((row) => row.getAttribute("aria-current") === "true");
    expect(current).toHaveTextContent("4,0★71–80");
    expect(screen.queryByText(detail.helpNoStars)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.queryByText(detail.helpIntro)).not.toBeInTheDocument();
  });

  it("sin estrellas, la ayuda explica que el número las elige y no resalta ningún tramo", () => {
    renderDialog({ noRating: true });
    fireEvent.click(screen.getByRole("button", { name: detail.helpToggle }));
    expect(screen.getByText(detail.helpNoStars)).toBeInTheDocument();
    expect(screen.getAllByRole("row").some((row) => row.getAttribute("aria-current") === "true")).toBe(false);
  });

  it("sin valoración no ofrece destacar ni borrar", () => {
    renderDialog({ noRating: true });
    expect(screen.queryByRole("button", { name: detail.highlight })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: detail.delete })).not.toBeInTheDocument();
  });

  it("borrar la nota pide confirmación y borra estrellas y puntaje", async () => {
    mocks.deleteRating.mockResolvedValue(null);
    const { onChange } = renderDialog({ detailedScore: 75 });
    fireEvent.click(screen.getByRole("button", { name: detail.delete }));
    fireEvent.click(await screen.findByRole("button", { name: detail.deleteConfirm }));

    await waitFor(() => expect(mocks.deleteRating).toHaveBeenCalledWith("release-group", RG));
    expect(onChange).toHaveBeenCalledWith(empty);
  });

  it("destacar alterna la valoración en el perfil", async () => {
    mocks.highlightRating.mockResolvedValue({});
    renderDialog({ isHighlighted: false });
    fireEvent.click(screen.getByRole("button", { name: detail.highlight }));
    await waitFor(() => expect(mocks.highlightRating).toHaveBeenCalledWith(own.id));
  });
});
