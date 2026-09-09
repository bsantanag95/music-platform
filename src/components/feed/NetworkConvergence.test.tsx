import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import { NetworkConvergence } from "./NetworkConvergence";
import type { ConvergenceItem } from "@/services/feed/convergence";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(
    (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${JSON.stringify(vars)}` : key,
  ),
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
  CoverThumb: ({ cover }: { cover: string | null }) => (
    <span data-testid="cover-thumb" data-cover={cover ?? ""} />
  ),
}));

function item(over: Partial<ConvergenceItem> = {}): ConvergenceItem {
  return {
    target: {
      type: "release-group",
      id: "rg1",
      title: "Currents",
      artistName: "Tame Impala",
      coverThumbUrl: "https://cover/1.jpg",
    },
    peopleCount: 3,
    peopleSample: [
      { username: "ana", displayName: "Ana" },
      { username: "pedro", displayName: "Pedro" },
      { username: "juan", displayName: null },
    ],
    lastInteractionAt: "2026-09-08T00:00:00Z",
    ...over,
  };
}

describe("NetworkConvergence", () => {
  it("no renderiza nada cuando no hay convergencia", async () => {
    const { container } = renderWithIntl(await NetworkConvergence({ items: [] }));
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra la obra como una síntesis: título enlazado, artista y nombres", async () => {
    renderWithIntl(await NetworkConvergence({ items: [item()] }));

    const link = screen.getByRole("link", { name: "Currents" });
    expect(link).toHaveAttribute("href", "/album/rg1");
    expect(screen.getByText("Tame Impala")).toBeInTheDocument();
    // muestra de nombres (displayName, o @username cuando falta)
    expect(screen.getByText(/Ana, Pedro, @juan/)).toBeInTheDocument();
    // la cifra real de personas se pasa al mensaje
    expect(screen.getByText(/convergence\.people.*"count":3/)).toBeInTheDocument();
  });

  it("con más personas que la muestra, agrega 'y N más' sin cambiar la cifra", async () => {
    renderWithIntl(
      await NetworkConvergence({ items: [item({ peopleCount: 7 })] }),
    );

    expect(screen.getByText(/convergence\.andMore.*"count":4/)).toBeInTheDocument();
    expect(screen.getByText(/convergence\.people.*"count":7/)).toBeInTheDocument();
  });

  it("una canción convergente enlaza a su página de canción", async () => {
    renderWithIntl(
      await NetworkConvergence({
        items: [
          item({
            target: {
              type: "recording",
              id: "rec9",
              title: "The Less I Know the Better",
              artistName: "Tame Impala",
              coverThumbUrl: null,
            },
          }),
        ],
      }),
    );

    expect(
      screen.getByRole("link", { name: "The Less I Know the Better" }),
    ).toHaveAttribute("href", "/song/rec9");
  });
});
