import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import concertsEs from "../../../messages/es/concerts.json";
import type { SharedConcertSummary } from "@/services/concerts/shared";
import { concertHref } from "@/lib/catalog-links";
import { ArtistConcerts } from "./ArtistConcerts";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/lib/api/concerts", () => ({ attendConcert: vi.fn(), unattendConcert: vi.fn() }));

const shared = concertsEs.shared;
const ARTIST = "00000000-0000-4000-8000-0000000000a1";

function concert(id: string, overrides: Partial<SharedConcertSummary> = {}): SharedConcertSummary {
  return {
    id: `00000000-0000-4000-8000-0000000000${id}`,
    name: `Concierto ${id}`,
    kind: "concert",
    eventDate: "2023-04-22",
    venue: "Santander Arena",
    city: "Santiago",
    country: null,
    attendees: null,
    attending: false,
    upcoming: false,
    ...overrides,
  };
}

const page = (over: Partial<Parameters<typeof ArtistConcerts>[0]["data"]> = {}) => ({ upcoming: [], past: [], page: 1, hasNext: false, ...over });

describe("ArtistConcerts", () => {
  it("próximos arriba sin 'Estuve ahí' y pasados por año con su acción", () => {
    renderWithIntl(
      <ArtistConcerts
        artistId={ARTIST}
        baseHref="/artist/x/concerts"
        data={page({
          upcoming: [concert("u1", { eventDate: "2027-01-10", upcoming: true })],
          past: [concert("p1", { eventDate: "2024-05-01" }), concert("p2", { eventDate: "2023-04-22", kind: "festival" })],
        })}
      />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([shared.upcoming, "2024", "2023"]);
    const upcoming = screen.getByRole("region", { name: shared.upcoming });
    expect(within(upcoming).queryByRole("button", { name: shared.attend })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: shared.attend })).toHaveLength(2);
    expect(screen.getByText(shared.festival)).toBeInTheDocument();
    const p1 = concert("p1");
    expect(screen.getByRole("link", { name: "Concierto p1" })).toHaveAttribute("href", concertHref(p1.name, p1.id));
  });

  it("cifra con umbral y sin sesión no hay acción", () => {
    renderWithIntl(
      <ArtistConcerts
        artistId={ARTIST}
        baseHref="/artist/x/concerts"
        data={page({
          past: [
            concert("p1", { attending: null, attendees: { kind: "fewer", threshold: 5 } }),
            concert("p2", { attending: null, attendees: { kind: "exact", value: 12 } }),
          ],
        })}
      />,
    );
    expect(screen.getByText("Menos de 5 personas estuvieron")).toBeInTheDocument();
    expect(screen.getByText("12 personas estuvieron")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("ya estuvo: muestra 'Estuviste' y Quitar", () => {
    renderWithIntl(<ArtistConcerts artistId={ARTIST} baseHref="/a" data={page({ past: [concert("p1", { attending: true })] })} />);
    expect(screen.getByText(new RegExp(shared.attending))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: shared.unattend })).toBeInTheDocument();
  });

  it("vacío: invita a Mis conciertos", () => {
    renderWithIntl(<ArtistConcerts artistId={ARTIST} baseHref="/a" data={page()} />);
    expect(screen.getByText(shared.empty)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: new RegExp(shared.emptyLink) })).toHaveAttribute("href", "/me/concerts");
  });

  it("paginación por URL", () => {
    renderWithIntl(<ArtistConcerts artistId={ARTIST} baseHref="/a" data={page({ page: 2, hasNext: true, past: [concert("p1")] })} />);
    expect(screen.getByRole("link", { name: new RegExp(shared.newer) })).toHaveAttribute("href", "/a");
    expect(screen.getByRole("link", { name: new RegExp(shared.older) })).toHaveAttribute("href", "/a?pagina=3");
  });
});
