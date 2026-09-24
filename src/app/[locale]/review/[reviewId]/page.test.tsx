import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../../../messages/es/catalog.json";
import commonEs from "../../../../../messages/es/common.json";

// Página propia de una reseña y su modal interceptado desde el álbum
// (openspec: redesign-album-page, capability `review-detail`).

const mocks = vi.hoisted(() => ({
  getReviewDetail: vi.fn(),
  listReviewIds: vi.fn(),
  back: vi.fn(),
}));

vi.mock("@/services/reviews", () => ({
  getReviewDetail: mocks.getReviewDetail,
  listReviewIds: mocks.listReviewIds,
  resolveSocialTarget: vi.fn().mockResolvedValue({ type: "release-group", id: "rg", column: "releaseGroupId" }),
}));
vi.mock("@/services/auth/sessions", () => ({ resolveSession: vi.fn().mockResolvedValue(null) }));
vi.mock("@/services/auth/authorization", () => ({ getUserPermissions: vi.fn().mockResolvedValue([]) }));
vi.mock("@/app/[locale]/(catalog)/album/[id]/album-data", () => ({
  loadSession: vi.fn().mockResolvedValue(null),
  loadCanModerate: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ back: mocks.back }),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const messages: Record<string, unknown> = { catalog: catalogEs, common: commonEs };
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async (namespace: string) => {
    return (key: string, params?: Record<string, string | number>) => {
      let value: unknown = messages;
      for (const part of `${namespace}.${key}`.split(".")) {
        value = value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined;
      }
      if (typeof value !== "string") return key;
      return Object.entries(params ?? {}).reduce((text, [k, v]) => text.replace(`{${k}}`, String(v)), value);
    };
  }),
}));

const REVIEW_ID = "00000000-0000-4000-8000-0000000000c1";
const ALBUM_ID = "00000000-0000-4000-8000-0000000000a1";

const detail = {
  review: {
    id: REVIEW_ID,
    user: { id: "u1", username: "ana", displayName: "Ana" },
    title: "Menos conceptual de lo que dicen",
    body: "El cuerpo completo de la reseña.",
    rating: { stars: 3.5, detailedScore: null },
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
  album: { id: ALBUM_ID, title: "The Dark Side of the Moon", coverThumbUrl: null },
};

beforeEach(() => vi.clearAllMocks());

describe("página de reseña", () => {
  it("muestra la reseña completa con enlace al álbum", async () => {
    mocks.getReviewDetail.mockResolvedValue(detail);
    const { default: ReviewPage } = await import("./page");
    renderWithIntl(await ReviewPage({ params: Promise.resolve({ reviewId: REVIEW_ID }) }));

    expect(screen.getByRole("heading", { level: 1, name: detail.review.title })).toBeInTheDocument();
    expect(screen.getByText(detail.review.body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reseña de The Dark Side of the Moon" })).toHaveAttribute(
      "href",
      `/album/${ALBUM_ID}`,
    );
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
  });

  it("responde 404 si la reseña no existe o no es visible", async () => {
    mocks.getReviewDetail.mockResolvedValue(null);
    const { default: ReviewPage } = await import("./page");
    await expect(ReviewPage({ params: Promise.resolve({ reviewId: REVIEW_ID }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(ReviewPage({ params: Promise.resolve({ reviewId: "no-uuid" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("modal de reseña interceptado", () => {
  it("abre la reseña en un diálogo con anterior y siguiente según el orden activo", async () => {
    mocks.getReviewDetail.mockResolvedValue(detail);
    mocks.listReviewIds.mockResolvedValue(["prev-id", REVIEW_ID, "next-id"]);
    const { default: InterceptedReviewPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/(tabs)/@modal/(..)(..)review/[reviewId]/page"
    );
    const element = await InterceptedReviewPage({
      params: Promise.resolve({ reviewId: REVIEW_ID }),
      searchParams: Promise.resolve({ sort: "best" }),
    });
    renderWithIntl(element);

    expect(await screen.findByRole("dialog", { name: detail.review.title })).toBeInTheDocument();
    expect(mocks.listReviewIds).toHaveBeenCalledWith(expect.anything(), "best");
    expect(screen.getByRole("link", { name: /Reseña anterior/ })).toHaveAttribute("href", "/review/prev-id?sort=best");
    expect(screen.getByRole("link", { name: /Reseña siguiente/ })).toHaveAttribute("href", "/review/next-id?sort=best");
    expect(screen.getByRole("link", { name: catalogEs.album.reviewModal.fullPage })).toHaveAttribute(
      "href",
      `/es/review/${REVIEW_ID}`,
    );
  });

  it("no muestra nada si la reseña no existe", async () => {
    mocks.getReviewDetail.mockResolvedValue(null);
    const { default: InterceptedReviewPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/(tabs)/@modal/(..)(..)review/[reviewId]/page"
    );
    await expect(
      InterceptedReviewPage({ params: Promise.resolve({ reviewId: REVIEW_ID }), searchParams: Promise.resolve({}) }),
    ).resolves.toBeNull();
  });
});
