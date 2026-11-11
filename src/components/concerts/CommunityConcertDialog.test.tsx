import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import concertsEs from "../../../messages/es/concerts.json";
import { ApiError } from "@/lib/api/errors";
import { concertHref } from "@/lib/catalog-links";
import { CommunityConcertDialog } from "./CommunityConcertDialog";

// "Agregar un concierto" (openspec: add-shared-concerts-phase2): candidatos primero, crear al final, errores por código y
// "Compartir este concierto" con la fecha fija y el recuerdo enlazado.

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  candidates: vi.fn(),
  push: vi.fn(),
  search: { query: "", searchable: false, candidates: [] as { id: string; title: string; subtitle: string | null }[], pending: false, failed: false },
}));

vi.mock("@/lib/api/concerts", () => ({
  createSharedConcert: mocks.create,
  fetchConcertCandidates: mocks.candidates,
  attendConcert: vi.fn(),
  unattendConcert: vi.fn(),
}));
vi.mock("@/components/quick-actions/use-target-search", () => ({ useTargetSearch: () => mocks.search }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/components/profiles/CountryPicker", () => ({
  CountryPicker: ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
    <label>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  ),
}));

const t = concertsEs.community.dialog;
const ARTIST = { id: "00000000-0000-4000-8000-0000000000a1", name: "Los Bunkers" };
const CREATED = { concert: { id: "00000000-0000-4000-8000-0000000000c1", name: "Los Bunkers en Teatro Caupolicán", status: "pending" }, entryId: "e1" };

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillPlace() {
  fill(t.date, "2009-05-15");
  fill(t.venue, "Teatro Caupolicán");
  fill(t.city, "Santiago");
  fill(t.country, "CL");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.candidates = [];
  mocks.search.searchable = false;
});

describe("CommunityConcertDialog", () => {
  it("sin candidatos pasa a los datos y crea con el nombre por defecto", async () => {
    mocks.candidates.mockResolvedValue([]);
    mocks.create.mockResolvedValue(CREATED);
    renderWithIntl(<CommunityConcertDialog open artist={ARTIST} onClose={vi.fn()} />);

    fillPlace();
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    await screen.findByText(t.noCandidates);
    expect(mocks.candidates).toHaveBeenCalledWith(ARTIST.id, "2009-05-15", "Santiago");

    fireEvent.click(screen.getByRole("button", { name: t.submit }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(concertHref(CREATED.concert.name, CREATED.concert.id)));
    expect(mocks.create).toHaveBeenCalledWith({
      artistId: ARTIST.id,
      performers: [],
      eventDate: "2009-05-15",
      venue: "Teatro Caupolicán",
      city: "Santiago",
      country: "CL",
      name: "Los Bunkers en Teatro Caupolicán",
      setlistfmUrl: null,
    });
  });

  it("exige fecha, recinto, ciudad y país antes de buscar", () => {
    renderWithIntl(<CommunityConcertDialog open artist={ARTIST} onClose={vi.fn()} />);
    fill(t.date, "2009-05-15");
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    expect(screen.getByRole("alert")).toHaveTextContent(t.errors.required);
    expect(mocks.candidates).not.toHaveBeenCalled();
  });

  it("muestra los candidatos con «Estuve ahí» y deja seguir si es otro", async () => {
    mocks.candidates.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-0000000000c9",
        name: "Los Bunkers en vivo",
        eventDate: "2009-05-16",
        venue: "Teatro Caupolicán",
        city: "Santiago",
        country: "CL",
        status: "pending",
        sameCity: true,
        attending: false,
      },
    ]);
    renderWithIntl(<CommunityConcertDialog open artist={ARTIST} onClose={vi.fn()} />);
    fillPlace();
    fireEvent.click(screen.getByRole("button", { name: t.continue }));

    const region = await screen.findByRole("region", { name: t.candidatesTitle });
    expect(within(region).getByRole("link", { name: "Los Bunkers en vivo" })).toBeInTheDocument();
    expect(within(region).getByText(new RegExp(`${t.sameCity} · ${t.pendingBadge}`))).toBeInTheDocument();
    expect(within(region).getByRole("button", { name: concertsEs.shared.attend })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: t.notListed }));
    expect(screen.getByRole("button", { name: t.submit })).toBeInTheDocument();
    // Regresión: el mismo clic no debe enviar el formulario (el botón de enviar es otro elemento).
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("traduce los errores del servidor por código", async () => {
    mocks.candidates.mockResolvedValue([]);
    mocks.create.mockRejectedValue(new ApiError("CONCERT_IMPLAUSIBLE", 400, "x"));
    renderWithIntl(<CommunityConcertDialog open artist={ARTIST} onClose={vi.fn()} />);
    fillPlace();
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(await screen.findByRole("button", { name: t.submit }));
    expect(await screen.findByRole("alert")).toHaveTextContent(t.errors.implausible);
  });

  it("compartir un recuerdo: fecha fija y el recuerdo en el pedido", async () => {
    mocks.candidates.mockResolvedValue([]);
    mocks.create.mockResolvedValue(CREATED);
    renderWithIntl(
      <CommunityConcertDialog
        open
        artist={ARTIST}
        onClose={vi.fn()}
        fromEntry={{ id: "00000000-0000-4000-8000-0000000000e7", eventDate: "2009-05-15", venue: "Teatro Caupolicán", city: "Santiago", country: "CL", setlistfmUrl: null }}
      />,
    );
    expect(screen.getByRole("dialog", { name: t.shareTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(t.date)).toHaveAttribute("readonly");
    fireEvent.click(screen.getByRole("button", { name: t.continue }));
    fireEvent.click(await screen.findByRole("button", { name: t.submit }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ fromEntryId: "00000000-0000-4000-8000-0000000000e7" })));
  });
});
