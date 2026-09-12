import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { CompactActivityRow } from "./CompactActivityRow";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Mismo mock que feed-row-parts.test.tsx: jsdom no hace layout real, así que se
// simula el alto natural del párrafo (`scrollHeight`) y un `lineHeight` de
// referencia para poder calcular el umbral que usa `ClampedSnippet` (2 líneas).
const LINE_HEIGHT = 20;
const THRESHOLD = LINE_HEIGHT * 2;

function mockNaturalHeight(scrollHeight: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
  const original = window.getComputedStyle.bind(window);
  vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) => {
    const style = original(el, pseudo);
    Object.defineProperty(style, "lineHeight", { configurable: true, value: `${LINE_HEIGHT}px` });
    return style;
  });
}

const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");

afterEach(() => {
  if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, "scrollHeight", originalScrollHeight);
  vi.restoreAllMocks();
});

const author = { id: "u1", username: "ana", displayName: "Ana" };
const target = {
  type: "release-group" as const,
  id: "a1b2c3d4-0000-4000-8000-000000000001",
  title: "The Dark Side of the Moon",
  coverThumbUrl: null,
};

describe("CompactActivityRow — plegado del snippet", () => {
  it("comentario corto (sin desborde real) no muestra 'Ver más'", () => {
    mockNaturalHeight(LINE_HEIGHT);
    renderWithIntl(
      <CompactActivityRow
        entry={{
          kind: "comment",
          id: "c1",
          body: "Un discazo.",
          createdAt: "2026-01-01T00:00:00.000Z",
          target,
          author,
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });

  it("reseña larga (desborde real) muestra 'Ver más' y expande/colapsa al click", async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    mockNaturalHeight(THRESHOLD + 80);
    renderWithIntl(
      <CompactActivityRow
        entry={{
          kind: "review",
          id: "r1",
          title: null,
          body: "Un ensayo largo sobre el disco que excede el recorte de dos líneas.",
          createdAt: "2026-01-01T00:00:00.000Z",
          target,
          author,
        }}
      />,
    );

    const body = screen.getByText(/Un ensayo largo/);
    expect(body.className).toMatch(/line-clamp-2/);
    const toggle = screen.getByRole("button", { name: "Ver más" });

    await user.click(toggle);
    expect(screen.getByText(/Un ensayo largo/).className).not.toMatch(/line-clamp-2/);
    expect(screen.getByRole("button", { name: "Ver menos" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver menos" }));
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });
    expect(screen.getByText(/Un ensayo largo/).className).toMatch(/line-clamp-2/);
  });

  it("un rating (sin cuerpo) no intenta renderizar el snippet", () => {
    renderWithIntl(
      <CompactActivityRow
        entry={{
          kind: "rating",
          id: "rt1",
          stars: "4.5",
          detailedScore: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          target,
          author,
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });
});

describe("CompactActivityRow — diferenciación visual por tipo (add-feed-kind-differentiation)", () => {
  it("una reseña gana el acento petróleo en la fila y en su rótulo", () => {
    const { container } = renderWithIntl(
      <CompactActivityRow
        entry={{
          kind: "review",
          id: "r2",
          title: null,
          body: "Corto.",
          createdAt: "2026-01-01T00:00:00.000Z",
          target,
          author,
        }}
      />,
    );

    expect(container.querySelector("li")!.className).toMatch(/border-petrol/);
    expect(screen.getByText("Reseñó").className).toMatch(/text-petrol/);
  });

  it("un comentario no lleva acento petróleo", () => {
    const { container } = renderWithIntl(
      <CompactActivityRow
        entry={{
          kind: "comment",
          id: "c2",
          body: "Corto.",
          createdAt: "2026-01-01T00:00:00.000Z",
          target,
          author,
        }}
      />,
    );

    expect(container.querySelector("li")!.className).not.toMatch(/border-petrol/);
    expect(screen.getByText("Comentó").className).not.toMatch(/text-petrol/);
  });

  it("comentario y reseña muestran un glifo junto al verbo; el rating no", () => {
    const { container: commentContainer } = renderWithIntl(
      <CompactActivityRow
        entry={{ kind: "comment", id: "c3", body: "Corto.", createdAt: "2026-01-01T00:00:00.000Z", target, author }}
      />,
    );
    expect(commentContainer.querySelector("svg")).not.toBeNull();

    const { container: ratingContainer } = renderWithIntl(
      <CompactActivityRow
        entry={{ kind: "rating", id: "rt2", stars: "3.0", detailedScore: null, createdAt: "2026-01-01T00:00:00.000Z", target, author }}
      />,
    );
    expect(ratingContainer.querySelector("svg")).toBeNull();
  });
});
