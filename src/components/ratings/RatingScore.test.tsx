import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import ratingsEs from "../../../messages/es/ratings.json";
import { RatingScore } from "./RatingScore";
import { RatingsIndex } from "./RatingsIndex";
import { RatingsDetailed } from "./RatingsDetailed";
import type { MyRatingEntry } from "@/lib/api/schemas";

// openspec: redesign-ratings-views (RatingScore compartido, Índice como tabla, Detallada con divisores).

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));
vi.mock("@/lib/api/social", () => ({ saveRating: vi.fn() }));

const t = ratingsEs;

function entry(n: number, title: string, detailedScore: number | null, year: number | null = 1987): MyRatingEntry {
  return {
    id: `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, "0")}`,
    targetType: "release-group",
    stars: 4,
    detailedScore,
    updatedAt: "2026-10-01T10:00:00.000Z",
    target: {
      id: `550e8400-e29b-41d4-a716-4466554400${String(n + 50).padStart(2, "0")}`,
      title,
      coverThumbUrl: null,
      artistName: "Heart",
      artistId: "550e8400-e29b-41d4-a716-446655440090",
      year,
    },
  };
}

describe("RatingScore", () => {
  it("con puntaje muestra 86/100 (full) o solo 86 (compact) y abre el diálogo", () => {
    const onEdit = vi.fn();
    const scored = entry(1, "Bad Animals", 86);
    const { unmount } = renderWithIntl(<RatingScore entry={scored} onEdit={onEdit} ariaLabel="Editar" />);
    expect(screen.getByRole("button", { name: "Editar" })).toHaveTextContent("86/100");
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalledWith(scored);
    unmount();

    renderWithIntl(<RatingScore entry={scored} onEdit={onEdit} ariaLabel="Editar" variant="compact" />);
    expect(screen.getByRole("button", { name: "Editar" })).toHaveTextContent(/^86$/);
  });

  it("sin puntaje muestra un guion con la ayuda 'Sin afinar', sin repetir la frase", () => {
    renderWithIntl(<RatingScore entry={entry(1, "X", null)} onEdit={vi.fn()} ariaLabel={t.untunedAction} />);
    const button = screen.getByRole("button", { name: t.untunedAction });
    expect(button).toHaveTextContent("—");
    expect(button).toHaveAttribute("title", t.untuned);
    expect(screen.queryByText(t.untuned)).not.toBeInTheDocument();
  });

  it("llega a 44 px con puntero grueso", () => {
    renderWithIntl(<RatingScore entry={entry(1, "X", 80)} onEdit={vi.fn()} ariaLabel="Editar" />);
    expect(screen.getByRole("button").className).toContain("[@media(pointer:coarse)]:min-h-11");
  });
});

describe("RatingsIndex (tabla)", () => {
  const actions = { onUpdate: vi.fn(), onEdit: vi.fn() };
  const entries = [entry(1, "Bad Animals", 86), entry(2, "Little Queen", null, null)];

  it("es una tabla con encabezados de columna y una fila por valoración", () => {
    renderWithIntl(<RatingsIndex entries={entries} actions={actions} display={{ showArtist: true, showType: true }} />);
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([t.colTitle, t.colType, t.colYear, t.colStars, t.colScore]);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: t.colTitle }).closest("thead")!.className).toContain("sr-only");
  });

  it("sin tipo en las filas (agrupado por tipo o artista) la columna de tipo desaparece", () => {
    renderWithIntl(<RatingsIndex entries={entries} actions={actions} display={{ showArtist: true, showType: false }} />);
    expect(screen.queryByRole("columnheader", { name: t.colType })).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(4);
  });

  it("alinea año, estrellas y nota en celdas propias y un año ausente deja la celda vacía", () => {
    renderWithIntl(<RatingsIndex entries={entries} actions={actions} display={{ showArtist: true, showType: false }} />);
    const [, first, second] = screen.getAllByRole("row");
    expect(within(first!).getAllByRole("cell")).toHaveLength(4);
    expect(within(first!).getAllByRole("cell")[1]).toHaveTextContent("1987");
    expect(within(second!).getAllByRole("cell")[1]).toHaveTextContent(/^$/);
    expect(within(second!).getByRole("button", { name: t.untunedAction })).toHaveTextContent("—");
  });

  it("el título trunca en una celda de ancho acotado y el puntaje abre el diálogo", () => {
    renderWithIntl(<RatingsIndex entries={entries} actions={actions} display={{ showArtist: true, showType: false }} />);
    expect(screen.getAllByRole("cell")[0]!.className).toContain("max-w-0");
    fireEvent.click(screen.getByRole("button", { name: "Editar la nota de Bad Animals" }));
    expect(actions.onEdit).toHaveBeenCalledWith(entries[0]);
  });
});

describe("RatingsDetailed (divisores)", () => {
  it("separa las filas con una línea fina en lugar de huecos", () => {
    const { container } = renderWithIntl(
      <RatingsDetailed
        entries={[entry(1, "Bad Animals", 86), entry(2, "Little Queen", null)]}
        actions={{ onUpdate: vi.fn(), onEdit: vi.fn() }}
        display={{ showArtist: true, showType: false }}
      />,
    );
    const list = container.firstElementChild as HTMLElement;
    expect(list.className).toContain("divide-y");
    expect(list.className).not.toContain("gap-4");
    expect(screen.getAllByRole("article")[0]!.className).toContain("py-2");
  });
});
