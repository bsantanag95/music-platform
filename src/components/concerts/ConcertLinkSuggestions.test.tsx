import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import concertsEs from "../../../messages/es/concerts.json";
import type { ConcertLinkSuggestion } from "@/services/concerts/suggestions";
import { ConcertLinkSuggestions } from "./ConcertLinkSuggestions";

// "¿Son estos tus conciertos?" (openspec: add-shared-concerts-phase3): enlazar quita las demás sugerencias del recuerdo,
// "No es este" solo la suya, "y N más" y el error.

const mocks = vi.hoisted(() => ({ link: vi.fn(), dismiss: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/api/concerts", () => ({ linkConcertEntry: mocks.link, dismissConcertSuggestion: mocks.dismiss }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  useRouter: () => ({ refresh: mocks.refresh }),
}));

const t = concertsEs.links;

function suggestion(entry: string, concert: string, over: Partial<ConcertLinkSuggestion["concert"]> = {}): ConcertLinkSuggestion {
  return {
    entry: { id: `00000000-0000-4000-8000-0000000000${entry}`, artistName: "Los Bunkers", eventDate: "2009", city: "Santiago", country: "CL" },
    concert: {
      id: `00000000-0000-4000-8000-0000000000${concert}`,
      name: `Concierto ${concert}`,
      eventDate: "2009-05-15",
      venue: "Teatro Caupolicán",
      city: "Santiago",
      country: "CL",
      status: "confirmed",
      ...over,
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("ConcertLinkSuggestions", () => {
  it("muestra el recuerdo y el concierto, con «Por confirmar» y cuántas más hay", () => {
    renderWithIntl(<ConcertLinkSuggestions suggestions={[suggestion("e1", "c1", { status: "pending" })]} total={3} />);
    const region = screen.getByRole("region", { name: t.title });
    expect(within(region).getByText(/Tu recuerdo: Los Bunkers, 2009 · Santiago, Chile/)).toBeInTheDocument();
    expect(within(region).getByRole("link", { name: "Concierto c1" })).toBeInTheDocument();
    expect(within(region).getByText(new RegExp(t.pending))).toBeInTheDocument();
    expect(within(region).getByText("y 2 sugerencias más")).toBeInTheDocument();
  });

  it("enlazar quita todas las sugerencias de ese recuerdo", async () => {
    mocks.link.mockResolvedValue({});
    renderWithIntl(
      <ConcertLinkSuggestions suggestions={[suggestion("e1", "c1"), suggestion("e1", "c2"), suggestion("e2", "c3")]} total={3} />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: t.link })[0]!);
    await waitFor(() => expect(screen.queryByText("Concierto c2")).not.toBeInTheDocument());
    expect(mocks.link).toHaveBeenCalledWith("00000000-0000-4000-8000-0000000000e1", "00000000-0000-4000-8000-0000000000c1");
    expect(screen.getByText("Concierto c3")).toBeInTheDocument();
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("«No es este» quita solo esa sugerencia", async () => {
    mocks.dismiss.mockResolvedValue(null);
    renderWithIntl(<ConcertLinkSuggestions suggestions={[suggestion("e1", "c1"), suggestion("e1", "c2")]} total={2} />);
    fireEvent.click(screen.getAllByRole("button", { name: t.dismiss })[0]!);
    await waitFor(() => expect(screen.queryByText("Concierto c1")).not.toBeInTheDocument());
    expect(screen.getByText("Concierto c2")).toBeInTheDocument();
  });

  it("un fallo se avisa en la sugerencia", async () => {
    mocks.link.mockRejectedValue(new Error("x"));
    renderWithIntl(<ConcertLinkSuggestions suggestions={[suggestion("e1", "c1")]} total={1} />);
    fireEvent.click(screen.getByRole("button", { name: t.link }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.error);
  });
});
