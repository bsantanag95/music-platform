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
const own: { id: string; stars: number; detailedScore: number | null; createdAt: string; updatedAt: string } = {
  id: "550e8400-e29b-41d4-a716-446655440009",
  stars: 4,
  detailedScore: null,
  createdAt: "",
  updatedAt: "",
};
const empty = { own: null, aggregate: { count: 0, averageStars: null, averageDetailedScore: null } };

function renderDialog(overrides: Partial<typeof own> & { isHighlighted?: boolean } = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  renderWithIntl(
    <RatingDetailDialog open onClose={onClose} releaseGroupId={RG} own={{ ...own, ...overrides }} onChange={onChange} />,
  );
  return { onChange, onClose };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRatings.mockResolvedValue(empty);
});

describe("RatingDetailDialog", () => {
  it("limita el puntaje al tramo de las estrellas vigentes", () => {
    renderDialog();
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("min", "71");
    expect(input).toHaveAttribute("max", "80");
    expect(screen.getByText(/entre 71 y 80/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "95" } });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: detail.save })).toBeDisabled();
  });

  it("guarda un puntaje coherente con las mismas estrellas", async () => {
    mocks.saveRating.mockResolvedValue({});
    const { onChange, onClose } = renderDialog();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "77" } });
    fireEvent.click(screen.getByRole("button", { name: detail.save }));

    await waitFor(() => expect(mocks.saveRating).toHaveBeenCalledWith("release-group", RG, { stars: 4, detailedScore: 77 }));
    expect(onChange).toHaveBeenCalledWith(empty);
    expect(onClose).toHaveBeenCalled();
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
