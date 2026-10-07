import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { HomeReleases } from "./HomeReleases";
import type { HomeRelease } from "@/services/home/home";

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  getLocale: vi.fn().mockResolvedValue("es"),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.stubGlobal("matchMedia", (query: string) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
}));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const release = (id: string): HomeRelease => ({
  id,
  title: `Disco ${id}`,
  artist: "Banda",
  coverThumbUrl: "https://example.com/cover.jpg",
  releaseDate: "2026-10-01",
  section: "recent",
  badge: null,
});

describe("HomeReleases", () => {
  it("sin sesión muestra solo la selección popular, sin selector", async () => {
    render(await HomeReleases({ releases: [release("x1")] }));
    expect(screen.getByText("Disco x1")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("sin sesión y sin lanzamientos no se muestra el apartado", async () => {
    const { container } = render(await HomeReleases({ releases: [] }));
    expect(container).toBeEmptyDOMElement();
  });

  it("con sesión y al menos 3 discos propios abre en «De tus artistas» sin invitación", async () => {
    render(
      await HomeReleases({
        releases: [release("x1")],
        personalReleases: [release("p1"), release("p2"), release("p3")],
      }),
    );
    expect(screen.getByRole("tab", { name: "releasesTabPersonal" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco p1")).toBeInTheDocument();
    expect(screen.queryByText("releasesFollowHint", { exact: false })).toBeNull();
  });

  it("con sesión y menos de 3 discos propios abre en «Populares» con la invitación", async () => {
    render(await HomeReleases({ releases: [release("x1")], personalReleases: [release("p1"), release("p2")] }));
    expect(screen.getByRole("tab", { name: "releasesTabPopular" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Disco x1")).toBeInTheDocument();
    expect(screen.getByText("releasesFollowHint", { exact: false })).toBeInTheDocument();
  });

  it("con sesión, sin calendario y sin discos propios no se muestra el apartado", async () => {
    const { container } = render(await HomeReleases({ releases: [], personalReleases: [] }));
    expect(container).toBeEmptyDOMElement();
  });
});
