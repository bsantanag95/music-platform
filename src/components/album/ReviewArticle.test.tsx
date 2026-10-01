import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ReviewArticle } from "./ReviewArticle";
import type { ReviewDetail } from "@/services/reviews";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/social/ContentActions", () => ({ ContentActions: () => <div data-testid="actions" /> }));

const AUTHOR = "00000000-0000-4000-8000-000000000001";

function detail(over: { authorId?: string; stars?: number | null; detailedScore?: number | null } = {}): ReviewDetail {
  const stars = over.stars === undefined ? 4.5 : over.stars;
  return {
    review: {
      id: "rv1",
      user: { id: over.authorId ?? AUTHOR, username: "ana", displayName: "Ana" },
      title: "Un título",
      body: "Cuerpo de la reseña.",
      rating: stars === null ? null : { stars, detailedScore: over.detailedScore === undefined ? 86 : over.detailedScore },
      createdAt: "2026-09-08T00:00:00.000Z",
      updatedAt: "2026-09-08T00:00:00.000Z",
    },
    album: { id: "rg1", title: "A Moon Shaped Pool", coverThumbUrl: null },
  };
}

describe("ReviewArticle", () => {
  it("el autor ve el puntaje detallado junto a las estrellas", () => {
    renderWithIntl(<ReviewArticle detail={detail()} viewerId={AUTHOR} canModerate={false} />);
    expect(screen.getByText("86/100")).toBeInTheDocument();
  });

  it("otra persona no ve el puntaje detallado", () => {
    renderWithIntl(
      <ReviewArticle detail={detail()} viewerId="00000000-0000-4000-8000-000000000099" canModerate={false} />,
    );
    expect(screen.queryByText("86/100")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /4,5/ })).toBeInTheDocument();
  });

  it("un visitante anónimo no ve el puntaje detallado", () => {
    renderWithIntl(<ReviewArticle detail={detail()} viewerId={null} canModerate={false} />);
    expect(screen.queryByText("86/100")).not.toBeInTheDocument();
  });

  it("sin puntaje detallado el autor no ve la cifra", () => {
    renderWithIntl(<ReviewArticle detail={detail({ detailedScore: null })} viewerId={AUTHOR} canModerate={false} />);
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: /4,5/ })).toBeInTheDocument();
  });
});
