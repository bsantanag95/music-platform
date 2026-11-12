import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import type { ConcertEntryDto } from "@/lib/api/schemas";
import { ConcertYearList } from "./ConcertYearList";
import { ConcertsPreview } from "./ConcertsPreview";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function entry(id: string, eventDate: string, overrides: Partial<ConcertEntryDto> = {}): ConcertEntryDto {
  return {
    id: `00000000-0000-4000-8000-0000000000${id}`,
    artist: { id: "00000000-0000-4000-8000-0000000000a1", name: "Soda Stereo" },
    eventDate,
    country: null,
    city: null,
    venue: null,
    tour: null,
    setlistfmUrl: null,
    note: null,
    audience: "public",
    concertId: null,
    createdAt: "2026-11-11T00:00:00.000Z",
    updatedAt: "2026-11-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("ConcertYearList", () => {
  it("agrupa por año con su cantidad y muestra lugar, gira y enlace al setlist", () => {
    renderWithIntl(
      <ConcertYearList
        entries={[
          entry("c1", "2024-05-01", { city: "Lima", country: "PE", venue: "Estadio Nacional", tour: "Gira 2024" }),
          entry("c2", "2007-10-20", { setlistfmUrl: "https://www.setlist.fm/setlist/soda-stereo/2007/x-1.html" }),
          entry("c3", "2007"),
        ]}
      />,
    );
    const sections = screen.getAllByRole("region");
    expect(sections.map((section) => within(section).getByRole("heading").textContent)).toEqual(["20241 concierto", "20072 conciertos"]);
    expect(screen.getByText("Estadio Nacional · Lima, Perú")).toBeInTheDocument();
    expect(screen.getByText("Gira 2024")).toBeInTheDocument();
    const setlist = screen.getByRole("link", { name: /Setlist/ });
    expect(setlist).toHaveAttribute("target", "_blank");
    expect(setlist.getAttribute("rel")).not.toContain("nofollow");
    expect(screen.getByText("20 oct")).toHaveAttribute("title", "20 de octubre de 2007");
  });

  it("la audiencia solo aparece para el dueño y si no es pública", () => {
    const entries = [entry("c1", "2019", { audience: "private" }), entry("c2", "2019", { audience: "public" })];
    const { unmount } = renderWithIntl(<ConcertYearList entries={entries} />);
    expect(screen.queryByText(/Privado/)).not.toBeInTheDocument();
    unmount();
    renderWithIntl(<ConcertYearList entries={entries} showAudience />);
    expect(screen.getAllByText(/Privado/)).toHaveLength(1);
    expect(screen.queryByText(/Público/)).not.toBeInTheDocument();
  });
});

describe("ConcertYearList para el dueño (polish-my-concerts)", () => {
  it("Seguidores es un ícono con su nombre al pasar el cursor; Privado conserva el texto", () => {
    renderWithIntl(
      <ConcertYearList entries={[entry("c1", "2019", { audience: "followers" }), entry("c2", "2018", { audience: "private" })]} showAudience />,
    );
    expect(screen.getByTitle("Seguidores")).toHaveTextContent("Seguidores");
    expect(screen.getByTitle("Seguidores").querySelector(".sr-only")).not.toBeNull();
    expect(screen.getByText("Privado")).not.toHaveClass("sr-only");
  });

  it("una fila sin lugar ofrece agregarlo solo al dueño", async () => {
    const onAddPlace = vi.fn();
    const only = entry("c1", "2022-05");
    const { unmount } = renderWithIntl(<ConcertYearList entries={[only]} />);
    expect(screen.queryByRole("button", { name: "Agregar lugar" })).not.toBeInTheDocument();
    unmount();
    renderWithIntl(<ConcertYearList entries={[only, entry("c2", "2022", { country: "DE" })]} onAddPlace={onAddPlace} />);
    expect(screen.getAllByRole("button", { name: "Agregar lugar" })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Agregar lugar" }));
    expect(onAddPlace).toHaveBeenCalledWith(only);
  });
});

describe("ConcertsPreview", () => {
  it("enlaza a la página completa solo si hay más de los mostrados", () => {
    const { unmount } = renderWithIntl(<ConcertsPreview entries={[entry("c1", "2019")]} total={1} username="ana" />);
    expect(screen.queryByText(/Ver todos/)).not.toBeInTheDocument();
    unmount();
    renderWithIntl(<ConcertsPreview entries={[entry("c1", "2019")]} total={8} username="ana" />);
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/users/ana/concerts");
  });
});
