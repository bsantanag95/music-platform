import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ListsGrid } from "./lists-shared";

const items = (n: number) => Array.from({ length: n }, (_, i) => <span key={i} />);

describe("ListsGrid", () => {
  it("toda variante parte de una columna base, para que el track no tome el ancho mínimo del contenido", () => {
    for (const cols of [1, 2, 3] as const) {
      const { container, unmount } = render(<ListsGrid cols={cols}>{items(5)}</ListsGrid>);
      expect((container.firstChild as HTMLElement).className).toContain("grid-cols-1");
      unmount();
    }
  });

  it("con tres columnas y dos tarjetas o menos, cae a dos para no dejar la fila coja", () => {
    for (const n of [1, 2]) {
      const { container, unmount } = render(<ListsGrid cols={3}>{items(n)}</ListsGrid>);
      expect((container.firstChild as HTMLElement).className).not.toContain("lg:grid-cols-3");
      unmount();
    }
    const { container } = render(<ListsGrid cols={3}>{items(3)}</ListsGrid>);
    expect((container.firstChild as HTMLElement).className).toContain("lg:grid-cols-3");
  });
});
