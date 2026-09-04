import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { FeedPreview } from "./FeedPreview";
import { RecentSelfActivity } from "./RecentSelfActivity";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { FeedEntry } from "@/services/feed/feed";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ label }: { label: string }) => <span data-testid="cover-thumb">{label}</span>,
}));

const author = { id: "u1", username: "fran", displayName: "Fran" };

const comment = {
  kind: "comment",
  id: "c1",
  body: "Producción impecable de principio a fin.",
  createdAt: "2026-08-01T00:00:00Z",
  target: { type: "release-group", id: "rg1", title: "Currents", artistName: "Tame Impala", coverThumbUrl: null },
  author,
} satisfies FeedEntry;

const favorite: FeedEntry = {
  kind: "favorite",
  id: "f1",
  targetType: "release-group",
  audience: "public",
  createdAt: "2026-08-02T00:00:00Z",
  target: { id: "rg2", title: "Lonerism", artistName: "Tame Impala", coverThumbUrl: null },
  author,
};

describe("FeedPreview", () => {
  it("usa la presentación por peso: comentario en bloque, favorito en línea", async () => {
    const ui = await FeedPreview({ entries: [comment, favorite] });
    renderWithIntl(ui);

    expect(screen.getByText("Producción impecable de principio a fin.")).toBeInTheDocument();
    expect(screen.getByText("Lonerism")).toBeInTheDocument();
  });

  it("muestra el empty state cuando no hay entradas", async () => {
    const ui = await FeedPreview({ entries: [] });
    renderWithIntl(ui);

    expect(screen.getByText("feedPreviewEmpty")).toBeInTheDocument();
  });
});

describe("RecentSelfActivity", () => {
  it("devuelve null sin entradas", async () => {
    expect(await RecentSelfActivity({ entries: [] })).toBeNull();
  });

  it("renderiza la actividad propia con la presentación por peso", async () => {
    const ui = await RecentSelfActivity({ entries: [comment] });
    if (!ui) throw new Error("RecentSelfActivity debería renderizar con entradas");
    renderWithIntl(ui);

    expect(screen.getByText("Producción impecable de principio a fin.")).toBeInTheDocument();
  });
});
