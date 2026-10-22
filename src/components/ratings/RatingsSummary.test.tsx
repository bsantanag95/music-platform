import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { MY_RATING_STAR_VALUES } from "@/lib/api/schemas";
import { RatingsSummary } from "./RatingsSummary";
import { RatingsTypeSegments } from "./RatingsTypeSegments";

// openspec: redesign-ratings-header-toolbar.

const buckets = (counts: Record<number, number>) =>
  MY_RATING_STAR_VALUES.map((value) => ({ value, count: counts[value] ?? 0 }));

function renderSummary(props: Partial<Parameters<typeof RatingsSummary>[0]> = {}) {
  const onStarsChange = vi.fn();
  renderWithIntl(
    <RatingsSummary
      total={5}
      counts={{ "release-group": 4, recording: 1 }}
      narrowed={false}
      stars={buckets({ 5: 3, 4.5: 2 })}
      starsFilter=""
      onStarsChange={onStarsChange}
      {...props}
    />,
  );
  return { onStarsChange };
}

describe("RatingsSummary", () => {
  it("muestra el total, el desglose, el promedio ponderado y diez barras", () => {
    renderSummary();
    expect(screen.getByText("5 valoraciones")).toBeInTheDocument();
    expect(screen.getByText("4 álbumes")).toBeInTheDocument();
    expect(screen.getByText("Promedio 4,8★")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Filtrar por estrellas" })).getAllByRole("button")).toHaveLength(10);
  });

  it("cada barra se anuncia con su valor y su cantidad, y rotula solo las estrellas enteras", () => {
    renderSummary();
    expect(screen.getByRole("button", { name: "4,5 estrellas: 2 valoraciones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5,0 estrellas: 3 valoraciones" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "0,5 estrellas: sin valoraciones" })).toBeInTheDocument();
    const axis = screen.getAllByRole("button").map((button) => button.textContent ?? "");
    expect(axis.filter((text) => text.includes("★"))).toHaveLength(5);
  });

  it("pulsar una barra pide el filtro de ese valor", () => {
    const { onStarsChange } = renderSummary();
    fireEvent.click(screen.getByRole("button", { name: "4,5 estrellas: 2 valoraciones" }));
    expect(onStarsChange).toHaveBeenCalledWith("4.5");
  });

  it("la barra del filtro activo está presionada y el promedio es su valor", () => {
    renderSummary({ starsFilter: "4.5" });
    expect(screen.getByRole("button", { name: "4,5 estrellas: 2 valoraciones" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5,0 estrellas: 3 valoraciones" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Promedio 4,5★")).toBeInTheDocument();
  });

  it("con filtros cuenta resultados y sin valoraciones oculta histograma y promedio", () => {
    renderSummary({ narrowed: true, total: 0, stars: buckets({}), counts: { "release-group": 0, recording: 0 } });
    expect(screen.getByText("Ningún resultado")).toBeInTheDocument();
    expect(screen.queryByText("Sin valoraciones")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Filtrar por estrellas" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Promedio/)).not.toBeInTheDocument();
  });

  it("con un filtro de estrellas activo el histograma se muestra aunque todo esté en cero", () => {
    renderSummary({ starsFilter: "1", total: 0, stars: buckets({}), narrowed: true });
    expect(screen.getByRole("button", { name: "1,0 estrellas: sin valoraciones" })).toHaveAttribute("aria-pressed", "true");
  });

  it("las barras llevan área táctil de 44 px con puntero grueso", () => {
    renderSummary();
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("[@media(pointer:coarse)]:min-h-11");
    }
  });
});

describe("RatingsTypeSegments", () => {
  const counts = { "release-group": 12, recording: 3 };

  it("ofrece Todo, Álbumes y Canciones con su cantidad", () => {
    renderWithIntl(<RatingsTypeSegments value="" onChange={vi.fn()} counts={counts} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["Todo15", "Álbumes12", "Canciones3"]);
    expect(screen.getByRole("button", { name: /^Todo/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("pulsar un segmento inactivo emite su valor y el activo no emite nada", () => {
    const onChange = vi.fn();
    renderWithIntl(<RatingsTypeSegments value="recording" onChange={onChange} counts={counts} />);
    fireEvent.click(screen.getByRole("button", { name: /^Canciones/ }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /^Álbumes/ }));
    expect(onChange).toHaveBeenCalledWith("release-group");
    fireEvent.click(screen.getByRole("button", { name: /^Todo/ }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("cada segmento llega a 44 px con puntero grueso", () => {
    renderWithIntl(<RatingsTypeSegments value="" onChange={vi.fn()} counts={counts} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button.className).toContain("[@media(pointer:coarse)]:min-h-11");
    }
  });
});
