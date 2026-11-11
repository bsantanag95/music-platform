import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import concertsEs from "../../../messages/es/concerts.json";
import { ConcertFormDialog } from "./ConcertFormDialog";

const mocks = vi.hoisted(() => ({
  createConcert: vi.fn(),
  updateConcert: vi.fn(),
  search: { query: "", searchable: false, candidates: [] as { id: string; title: string; subtitle: string | null }[], pending: false, failed: false },
}));

vi.mock("@/lib/api/concerts", () => ({ createConcert: mocks.createConcert, updateConcert: mocks.updateConcert }));
vi.mock("@/components/quick-actions/use-target-search", () => ({ useTargetSearch: () => mocks.search }));

const form = concertsEs.form;
const ARTIST = { id: "00000000-0000-4000-8000-0000000000a1", name: "Soda Stereo" };
const saved = { id: "00000000-0000-4000-8000-0000000000c1" };

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search.candidates = [];
  mocks.search.searchable = false;
});

describe("ConcertFormDialog", () => {
  it("crea con el artista fijo y la fecha armada, sin elegir audiencia", async () => {
    mocks.createConcert.mockResolvedValue(saved);
    const onSaved = vi.fn();
    renderWithIntl(<ConcertFormDialog open mode="create" artist={ARTIST} onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.queryByText(form.artistChange)).not.toBeInTheDocument();
    expect(screen.queryByText(form.audienceLabel)).not.toBeInTheDocument();
    fill(form.year, "2007");
    fill(form.month, "10");
    fill(form.day, "20");
    fill(form.venue, "  Estadio River Plate ");
    fireEvent.click(screen.getByRole("button", { name: form.save }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(mocks.createConcert).toHaveBeenCalledWith({
      artistId: ARTIST.id,
      eventDate: "2007-10-20",
      country: null,
      city: null,
      venue: "Estadio River Plate",
      tour: null,
      setlistfmUrl: null,
      note: null,
    });
  });

  it("sin año no guarda y lo explica", () => {
    renderWithIntl(<ConcertFormDialog open mode="create" artist={ARTIST} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: form.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(form.errors.yearInvalid);
    expect(mocks.createConcert).not.toHaveBeenCalled();
  });

  it("un día que no existe en el mes", () => {
    renderWithIntl(<ConcertFormDialog open mode="create" artist={ARTIST} onClose={vi.fn()} onSaved={vi.fn()} />);
    fill(form.year, "2019");
    fill(form.month, "2");
    fill(form.day, "30");
    fireEvent.click(screen.getByRole("button", { name: form.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(form.errors.dayInvalid);
  });

  it("una fecha futura", () => {
    renderWithIntl(<ConcertFormDialog open mode="create" artist={ARTIST} onClose={vi.fn()} onSaved={vi.fn()} />);
    fill(form.year, String(new Date().getUTCFullYear() + 2));
    fireEvent.click(screen.getByRole("button", { name: form.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(form.errors.dateFuture);
  });

  it("un enlace que no es un setlist de setlist.fm", () => {
    renderWithIntl(<ConcertFormDialog open mode="create" artist={ARTIST} onClose={vi.fn()} onSaved={vi.fn()} />);
    fill(form.year, "2019");
    fill(form.setlist, "https://www.setlist.fm/setlists/soda-stereo-1.html");
    fireEvent.click(screen.getByRole("button", { name: form.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(form.errors.setlistInvalid);
  });

  it("sin artista fijo: busca y elige; sin elegir no guarda", () => {
    mocks.search.searchable = true;
    mocks.search.candidates = [{ id: ARTIST.id, title: ARTIST.name, subtitle: "Argentina" }];
    renderWithIntl(<ConcertFormDialog open mode="create" artist={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    fill(form.year, "2007");
    fireEvent.click(screen.getByRole("button", { name: form.save }));
    expect(screen.getByRole("alert")).toHaveTextContent(form.errors.artistRequired);

    fireEvent.click(screen.getByRole("button", { name: /Soda Stereo/ }));
    expect(screen.getByText(form.artistChange)).toBeInTheDocument();
  });

  it("editar: muestra la audiencia y envía todos los campos", async () => {
    mocks.updateConcert.mockResolvedValue(saved);
    const entry = {
      id: saved.id,
      artist: ARTIST,
      eventDate: "2007",
      country: "AR",
      city: "Buenos Aires",
      venue: null,
      tour: null,
      setlistfmUrl: null,
      note: null,
      audience: "followers" as const,
      createdAt: "2026-11-11T00:00:00.000Z",
      updatedAt: "2026-11-11T00:00:00.000Z",
    };
    renderWithIntl(<ConcertFormDialog open mode="edit" entry={entry} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(form.year)).toHaveValue("2007");
    fireEvent.click(screen.getByLabelText(concertsEs.audience.public));
    fireEvent.click(screen.getByRole("button", { name: form.save }));
    await waitFor(() =>
      expect(mocks.updateConcert).toHaveBeenCalledWith(
        saved.id,
        expect.objectContaining({ eventDate: "2007", country: "AR", city: "Buenos Aires", audience: "public" }),
      ),
    );
  });
});
