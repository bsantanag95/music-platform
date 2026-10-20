import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { ActivityContextRail } from "./ActivityContextRail";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${JSON.stringify(values)})` : key,
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
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: () => <span data-testid="cover" /> }));

const album = {
  releaseGroupId: "rg1",
  title: "In Rainbows",
  coverThumbUrl: null,
  artistName: "Radiohead",
  artistId: "art1",
  people: 5,
};

async function renderRail(props: Parameters<typeof ActivityContextRail>[0]) {
  const element = await ActivityContextRail(props);
  return render(<>{element}</>);
}

describe("ActivityContextRail", () => {
  it("lista los álbumes con más conversación con la cantidad de personas", async () => {
    await renderRail({ conversations: [album], followingCount: 10 });

    expect(screen.getByRole("heading", { name: "community.rail.conversationTitle" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "In Rainbows" }).getAttribute("href")).toContain("rg1");
    expect(screen.getByText(/community\.rail\.people\(\{"count":5\}\)/)).toBeInTheDocument();
  });

  it("con menos de 5 personas el álbum aparece pero sin la cifra", async () => {
    await renderRail({ conversations: [{ ...album, people: 3 }], followingCount: 10 });

    expect(screen.getByRole("link", { name: "In Rainbows" })).toBeInTheDocument();
    expect(screen.queryByText(/community\.rail\.people/)).not.toBeInTheDocument();
  });

  it("sin álbumes y siguiendo a 3 o más personas no renderiza nada", async () => {
    const { container } = await renderRail({ conversations: [], followingCount: 3 });

    expect(container).toBeEmptyDOMElement();
  });

  it("con menos de 3 seguidos invita a descubrir personas", async () => {
    await renderRail({ conversations: [], followingCount: 2 });

    expect(screen.getByRole("heading", { name: "community.rail.followTitle" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "community.empty.discoverAction" })).toHaveAttribute("href", "/users");
  });

  it("sin sesión invita a crear una cuenta", async () => {
    await renderRail({ conversations: [], followingCount: null });

    expect(screen.getByRole("link", { name: "community.rail.joinAction" })).toHaveAttribute("href", "/auth/register");
  });
});
