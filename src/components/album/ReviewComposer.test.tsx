import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { ReviewComposer } from "./ReviewComposer";
import type { Review } from "@/lib/api/schemas";

const mocks = vi.hoisted(() => ({
  saveReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/lib/api/social", () => ({
  saveReview: mocks.saveReview,
  updateReview: mocks.updateReview,
  deleteReview: mocks.deleteReview,
}));

const social = catalogEs.social;
const RG = "00000000-0000-4000-8000-0000000000a1";

const ownReview: Review = {
  id: "00000000-0000-4000-8000-0000000000b1",
  user: { id: "me", username: "me", displayName: "Me" },
  title: "Mi título",
  body: "Mi reseña anterior",
  rating: { stars: 4, detailedScore: null },
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("ReviewComposer", () => {
  it("sin sesión ofrece iniciar sesión y no muestra editor", () => {
    renderWithIntl(<ReviewComposer releaseGroupId={RG} authenticated={false} ownStars={0} ownReview={null} />);
    expect(screen.getByRole("link", { name: social.loginToReview })).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
  });

  it("pide estrellas cuando el usuario no valoró el álbum", () => {
    renderWithIntl(<ReviewComposer releaseGroupId={RG} authenticated ownStars={0} ownReview={null} />);
    expect(screen.getByText(social.starsLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: social.reviewSubmit })).toBeDisabled();
  });

  it("no pide estrellas cuando el usuario ya valoró el álbum y publica con título opcional", async () => {
    const user = userEvent.setup();
    mocks.saveReview.mockResolvedValue({ ...ownReview, body: "Un texto nuevo" });
    renderWithIntl(<ReviewComposer releaseGroupId={RG} authenticated ownStars={4} ownReview={null} />);
    expect(screen.queryByText(social.starsLabel)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(social.reviewTitleLabel), "Mi título");
    await user.type(screen.getByLabelText(social.reviewBodyLabel), "Un texto nuevo");
    await user.click(screen.getByRole("button", { name: social.reviewSubmit }));

    expect(mocks.saveReview).toHaveBeenCalledWith("release-group", RG, { body: "Un texto nuevo", title: "Mi título" });
    expect(await screen.findByText("Un texto nuevo")).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("muestra la reseña propia y permite editarla", async () => {
    const user = userEvent.setup();
    mocks.updateReview.mockResolvedValue({ ...ownReview, body: "Texto corregido" });
    renderWithIntl(<ReviewComposer releaseGroupId={RG} authenticated ownStars={4} ownReview={ownReview} />);
    expect(screen.getByText("Mi reseña anterior")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: social.edit }));
    const body = screen.getByLabelText(social.reviewBodyLabel);
    await user.clear(body);
    await user.type(body, "Texto corregido");
    await user.click(screen.getByRole("button", { name: social.reviewUpdate }));

    expect(mocks.updateReview).toHaveBeenCalledWith(ownReview.id, { body: "Texto corregido", title: "Mi título" });
    expect(await screen.findByText("Texto corregido")).toBeInTheDocument();
  });
});
