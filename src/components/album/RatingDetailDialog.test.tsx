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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRatings.mockResolvedValue(empty);
});

describe("RatingDetailDialog", () => {
  it("acepta todo el rango 1–100 y muestra la equivalencia y el cambio de estrellas", () => {
    renderDialog();
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "100");

    fireEvent.change(input, { target: { value: "86" } });
    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/86 → 4,5★/)).toBeInTheDocument();
    expect(screen.getByText(/Cambiará tus estrellas de 4,0★ a 4,5★/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: detail.save })).toBeEnabled();
  });

  it("rechaza un valor fuera de 1–100 y no permite guardar", () => {
    renderDialog();
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "101" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: detail.save })).toBeDisabled();

    fireEvent.change(input, { target: { value: "0" } });
    expect(screen.getByRole("button", { name: detail.save })).toBeDisabled();
  });

  it("guarda solo el puntaje y deja que el servidor derive las estrellas", async () => {
    mocks.saveRating.mockResolvedValue({});
    const { onChange, onClose } = renderDialog();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "86" } });
    fireEvent.click(screen.getByRole("button", { name: detail.save }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { detailedScore: 86 }));
    expect(onChange).toHaveBeenCalledWith(empty);
    expect(onClose).toHaveBeenCalled();
  });

  it("permite puntuar sin estrellas previas", async () => {
    mocks.saveRating.mockResolvedValue({});
    const { onClose } = renderDialog({ noRating: true });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "86" } });
    fireEvent.click(screen.getByRole("button", { name: detail.save }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { detailedScore: 86 }));
    expect(onClose).toHaveBeenCalled();
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
