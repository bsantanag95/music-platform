import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { FavoriteTile } from "./FavoriteTile";
import type { Favorite } from "@/lib/api/schemas";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({
  CoverThumb: ({ cover }: { cover: string | null }) => (
    <span data-testid="cover-thumb" data-cover={cover ?? ""} />
  ),
}));
vi.mock("@/components/catalog/DiscPlaceholder", () => ({
  DiscPlaceholder: () => <span data-testid="disc-placeholder" />,
}));

function favorite(overrides: Partial<Favorite> = {}): Favorite {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    targetType: "release-group",
    audience: "followers",
    createdAt: "2026-02-01T00:00:00.000Z",
    target: { id: "11111111-0000-4000-8000-000000000001", title: "The Wall", coverThumbUrl: "c.jpg" },
    ...overrides,
  };
}

describe("FavoriteTile", () => {
  it("álbum: muestra la carátula y enlaza al álbum", () => {
    renderWithIntl(<FavoriteTile favorite={favorite()} />);
    expect(screen.getByTestId("cover-thumb")).toHaveAttribute("data-cover", "c.jpg");
    expect(screen.getByRole("link", { name: "The Wall" })).toHaveAttribute(
      "href",
      "/album/11111111-0000-4000-8000-000000000001",
    );
  });

  it("artista: placa tipográfica con la inicial, sin disco, enlaza al artista", () => {
    renderWithIntl(
      <FavoriteTile
        favorite={favorite({
          targetType: "artist",
          target: { id: "a1", title: "Radiohead", coverThumbUrl: null },
        })}
      />,
    );
    expect(screen.queryByTestId("disc-placeholder")).not.toBeInTheDocument();
    expect(screen.queryByTestId("cover-thumb")).not.toBeInTheDocument();
    expect(screen.getByText("R", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Radiohead" })).toHaveAttribute("href", "/artist/a1");
  });

  it("canción: silueta de disco y enlace a la canción", () => {
    renderWithIntl(
      <FavoriteTile
        favorite={favorite({
          targetType: "recording",
          target: { id: "s1", title: "Karma Police", coverThumbUrl: null },
        })}
      />,
    );
    expect(screen.getByTestId("disc-placeholder")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Karma Police" })).toHaveAttribute("href", "/song/s1");
  });

  it("modo propio: cambia la audiencia con el selector", async () => {
    const onAudienceChange = vi.fn();
    renderWithIntl(<FavoriteTile favorite={favorite()} onAudienceChange={onAudienceChange} />);
    await userEvent.selectOptions(screen.getByLabelText("Audiencia"), "public");
    expect(onAudienceChange).toHaveBeenCalledWith(expect.objectContaining({ id: favorite().id }), "public");
  });

  it("modo lectura: sin selector de audiencia ni quitar", () => {
    renderWithIntl(<FavoriteTile favorite={favorite()} readOnly />);
    expect(screen.queryByLabelText("Audiencia")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar favorito" })).not.toBeInTheDocument();
  });

  it("modo selección: muestra la casilla y notifica al marcarla", async () => {
    const onToggleSelect = vi.fn();
    renderWithIntl(
      <FavoriteTile favorite={favorite()} selectionMode selected={false} onToggleSelect={onToggleSelect} />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar The Wall" }));
    expect(onToggleSelect).toHaveBeenCalledWith(favorite().id);
  });
});
