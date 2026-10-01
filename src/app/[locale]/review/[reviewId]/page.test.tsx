import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { albumHref, localeHref, reviewHref, reviewSegment } from "@/lib/catalog-links";
import catalogEs from "../../../../../messages/es/catalog.json";
import commonEs from "../../../../../messages/es/common.json";

// Página propia de una reseña y su modal interceptado desde el álbum
// (openspec: redesign-album-page, capability `review-detail`).

const mocks = vi.hoisted(() => ({
  getReviewDetail: vi.fn(),
  listReviewNeighbors: vi.fn(),
  back: vi.fn(),
}));

vi.mock("@/services/reviews", () => ({
  getReviewDetail: mocks.getReviewDetail,
  listReviewNeighbors: mocks.listReviewNeighbors,
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
  permanentRedirect: (url: string) => {
    throw new Error(`NEXT_PERMANENT_REDIRECT:${url}`);
  },
}));

const messages: Record<string, unknown> = { catalog: catalogEs, common: commonEs };
vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("es"),
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
const ALBUM_TITLE = "The Dark Side of the Moon";
const REVIEW_SEGMENT = reviewSegment("ana", ALBUM_TITLE, REVIEW_ID);

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
  album: { id: ALBUM_ID, title: ALBUM_TITLE, coverThumbUrl: null },
};

beforeEach(() => vi.clearAllMocks());

describe("página de reseña", () => {
  it("muestra la reseña completa con enlace al álbum desde el segmento canónico", async () => {
    mocks.getReviewDetail.mockResolvedValue(detail);
    const { default: ReviewPage } = await import("./page");
    renderWithIntl(await ReviewPage({ params: Promise.resolve({ reviewId: REVIEW_SEGMENT }) }));

    expect(mocks.getReviewDetail).toHaveBeenCalledWith(REVIEW_ID);
    expect(screen.getByRole("heading", { level: 1, name: detail.review.title })).toBeInTheDocument();
    expect(screen.getByText(detail.review.body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reseña de The Dark Side of the Moon" })).toHaveAttribute(
      "href",
      albumHref(null, ALBUM_TITLE, ALBUM_ID),
    );
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute("href", "/users/ana");
    // La nota se dibuja como fila de estrellas con el valor en la etiqueta accesible.
    expect(screen.getByRole("img", { name: "3,5 estrellas" })).toBeInTheDocument();
  });

  it("UUID hexadecimal viejo → 308 a la dirección canónica", async () => {
    mocks.getReviewDetail.mockResolvedValue(detail);
    const { default: ReviewPage } = await import("./page");
    await expect(ReviewPage({ params: Promise.resolve({ reviewId: REVIEW_ID }) })).rejects.toThrow(
      `NEXT_PERMANENT_REDIRECT:/es/review/${REVIEW_SEGMENT}`,
    );
  });

  it("responde 404 si la reseña no existe o no es visible", async () => {
    mocks.getReviewDetail.mockResolvedValue(null);
    const { default: ReviewPage } = await import("./page");
    await expect(ReviewPage({ params: Promise.resolve({ reviewId: REVIEW_SEGMENT }) })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(ReviewPage({ params: Promise.resolve({ reviewId: "no-slug" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("modal de reseña interceptado", () => {
  it("abre la reseña en un diálogo con anterior y siguiente canónicos según el orden activo", async () => {
    mocks.getReviewDetail.mockResolvedValue(detail);
    mocks.listReviewNeighbors.mockResolvedValue({
      previous: { id: "prev-id", href: "/review/ana-otro-prev" },
      next: { id: "next-id", href: "/review/ana-otro-next" },
    });
    const { default: InterceptedReviewPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/(tabs)/@modal/(..)(..)review/[reviewId]/page"
    );
    const element = await InterceptedReviewPage({
      params: Promise.resolve({ reviewId: REVIEW_SEGMENT }),
      searchParams: Promise.resolve({ sort: "best" }),
    });
    renderWithIntl(element);

    expect(await screen.findByRole("dialog", { name: detail.review.title })).toBeInTheDocument();
    expect(mocks.listReviewNeighbors).toHaveBeenCalledWith(expect.anything(), ALBUM_TITLE, REVIEW_ID, "best");
    expect(screen.getByRole("link", { name: /Reseña anterior/ })).toHaveAttribute("href", "/review/ana-otro-prev?sort=best");
    expect(screen.getByRole("link", { name: /Reseña siguiente/ })).toHaveAttribute("href", "/review/ana-otro-next?sort=best");
    expect(screen.getByRole("link", { name: catalogEs.album.reviewModal.fullPage })).toHaveAttribute(
      "href",
      localeHref("es", reviewHref("ana", ALBUM_TITLE, REVIEW_ID)),
    );
  });

  it("no muestra nada si la reseña no existe", async () => {
    mocks.getReviewDetail.mockResolvedValue(null);
    const { default: InterceptedReviewPage } = await import(
      "@/app/[locale]/(catalog)/album/[id]/(tabs)/@modal/(..)(..)review/[reviewId]/page"
    );
    await expect(
      InterceptedReviewPage({ params: Promise.resolve({ reviewId: REVIEW_SEGMENT }), searchParams: Promise.resolve({}) }),
    ).resolves.toBeNull();
  });
});
