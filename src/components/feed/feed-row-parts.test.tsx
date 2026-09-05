import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { ProsePanel } from "./feed-row-parts";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// jsdom no hace layout real: `scrollHeight` es siempre 0 y `getComputedStyle`
// no resuelve `line-height` a píxeles. La detección de desborde de
// `ProsePanel` mide la altura NATURAL del párrafo (antes de recortar) contra
// `lineHeight × 6` — así que acá se mockean ambos: `scrollHeight` simula el
// alto real del contenido completo, y `getComputedStyle` fija un
// `lineHeight` de referencia (20px) para poder calcular el umbral esperado.
const LINE_HEIGHT = 20;
const THRESHOLD = LINE_HEIGHT * 6; // 120 — el mismo cálculo que hace el componente

function mockNaturalHeight(scrollHeight: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => scrollHeight,
  });
  // Se parte del `CSSStyleDeclaration` real de jsdom (soporta `getPropertyValue`,
  // que usa internamente `getByRole` al calcular nombres accesibles) y solo se
  // pisa `lineHeight` — reemplazar el objeto entero por uno plano rompe esas
  // llamadas con "getPropertyValue is not a function".
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

describe("ProsePanel — plegado de citas largas (clamp)", () => {
  it("sin `clamp`, nunca muestra el botón de expandir, sin importar el largo", () => {
    mockNaturalHeight(THRESHOLD + 80); // desbordaría bastante si `clamp` estuviera activo
    renderWithIntl(<ProsePanel body="Un texto cualquiera" variant="impression" />);

    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
  });

  it("con `clamp` pero sin desborde real (texto corto de una línea), no muestra el botón", () => {
    // Este es exactamente el caso que falló en la verificación manual: un
    // comentario de una sola oración no debe activar "Ver más".
    mockNaturalHeight(LINE_HEIGHT); // una sola línea, muy por debajo del umbral
    renderWithIntl(
      <ProsePanel body="No me terminó de convencer, esperaba más de esto." variant="comment" clamp />,
    );

    expect(screen.queryByRole("button", { name: "Ver más" })).not.toBeInTheDocument();
    expect(screen.getByText("No me terminó de convencer, esperaba más de esto.").className).not.toMatch(
      /line-clamp-6/,
    );
  });

  it("con `clamp` y desborde real, muestra 'Ver más' y expande/colapsa al click", async () => {
    const user = userEvent.setup();
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    mockNaturalHeight(THRESHOLD + 80); // supera las 6 líneas → desborda
    renderWithIntl(<ProsePanel body="Un comentario muy largo" variant="comment" clamp />);

    const body = screen.getByText("Un comentario muy largo");
    expect(body.className).toMatch(/line-clamp-6/);
    const toggle = screen.getByRole("button", { name: "Ver más" });

    await user.click(toggle);
    expect(screen.getByText("Un comentario muy largo").className).not.toMatch(/line-clamp-6/);
    expect(screen.getByRole("button", { name: "Ver menos" })).toBeInTheDocument();
    // Al expandir no hace falta corregir el scroll — el contenido crece, no
    // se encoge, así que no debería llamarse todavía.
    expect(scrollSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ver menos" }));
    // Al colapsar sí: sin esto, "Ver menos" deja al usuario mirando lo que
    // quedó mucho más abajo (feedback de usuario, 2026-09-05).
    expect(scrollSpy).toHaveBeenCalledWith({ block: "nearest" });
    expect(screen.getByText("Un comentario muy largo").className).toMatch(/line-clamp-6/);
    expect(screen.getByRole("button", { name: "Ver más" })).toBeInTheDocument();
  });

  it("comentario plegado: redonda y sin comillas", () => {
    mockNaturalHeight(THRESHOLD + 80);
    renderWithIntl(<ProsePanel body="Una crítica sin vueltas" variant="comment" clamp />);

    const body = screen.getByText("Una crítica sin vueltas");
    expect(body.className).not.toMatch(/italic/);
    expect(body.textContent).toBe("Una crítica sin vueltas");
  });

  it("nota de escucha plegada: cursiva y entre comillas, igual que sin clamp", () => {
    mockNaturalHeight(LINE_HEIGHT);
    renderWithIntl(<ProsePanel body="Me voló la cabeza" variant="impression" clamp />);

    const body = screen.getByText(
      (_, node) => node?.tagName === "P" && node?.textContent === "“Me voló la cabeza”",
    );
    expect(body.className).toMatch(/italic/);
  });
});
