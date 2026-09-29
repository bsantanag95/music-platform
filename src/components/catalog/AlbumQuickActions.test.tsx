import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { renderWithIntl } from "@/test/i18n-test-utils";
import catalogEs from "../../../messages/es/catalog.json";
import { AlbumQuickActions } from "./AlbumQuickActions";

// Marcas bajo demanda (openspec: extend-album-quick-actions): fuera de la discografía el menú
// pide las marcas del disco al abrirse, una vez, con reintento ante un fallo, y nunca sin sesión.

const mocks = vi.hoisted(() => ({ getReleaseGroupMarks: vi.fn(), toggleFavorite: vi.fn() }));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/api/catalog", () => ({ getReleaseGroupMarks: mocks.getReleaseGroupMarks }));
vi.mock("@/lib/api/diary", () => ({ createListenEntry: vi.fn() }));
vi.mock("@/lib/api/favorites", () => ({ toggleFavorite: mocks.toggleFavorite }));
vi.mock("@/lib/api/want-to-listen", () => ({ toggleWantToListen: vi.fn() }));
vi.mock("@/lib/api/social", () => ({ saveRating: vi.fn() }));
vi.mock("@/components/album/AlbumListPicker", () => ({ AlbumListPicker: () => null }));

const a = catalogEs.albumActions;
const MARKS = { listened: false, stars: null, detailedScore: null, favorite: true, pending: false, lists: [] };

function Harness({ authenticated, extras }: { authenticated: boolean; extras?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <AlbumQuickActions
      item={{ id: "rg1", title: "Dr. Feelgood" }}
      authenticated={authenticated}
      open={open}
      onOpenChange={setOpen}
      variant="row"
      extraActions={extras}
    />
  );
}

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: a.open.replace("{title}", "Dr. Feelgood") }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AlbumQuickActions con marcas bajo demanda", () => {
  it("pide las marcas al abrir y las muestra; no las vuelve a pedir al reabrir", async () => {
    mocks.getReleaseGroupMarks.mockResolvedValue(MARKS);
    renderWithIntl(<Harness authenticated />);
    expect(mocks.getReleaseGroupMarks).not.toHaveBeenCalled();

    await act(async () => openMenu());
    expect(mocks.getReleaseGroupMarks).toHaveBeenCalledWith("rg1");
    await waitFor(() => expect(screen.getByRole("button", { name: a.favorite })).toHaveAttribute("aria-pressed", "true"));

    openMenu();
    await act(async () => openMenu());
    expect(mocks.getReleaseGroupMarks).toHaveBeenCalledTimes(1);
  });

  it("mientras cargan, las acciones están deshabilitadas", async () => {
    let resolve!: (value: typeof MARKS) => void;
    mocks.getReleaseGroupMarks.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithIntl(<Harness authenticated />);
    await act(async () => openMenu());
    expect(screen.getByRole("button", { name: a.logListen })).toBeDisabled();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    await act(async () => resolve(MARKS));
    expect(screen.getByRole("button", { name: a.logListen })).toBeEnabled();
  });

  it("un fallo de carga ofrece reintentar", async () => {
    mocks.getReleaseGroupMarks.mockRejectedValueOnce(new Error("caído")).mockResolvedValueOnce(MARKS);
    renderWithIntl(<Harness authenticated />);
    await act(async () => openMenu());
    expect(await screen.findByRole("alert")).toHaveTextContent(a.loadError);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: a.retry })));
    await waitFor(() => expect(screen.getByRole("button", { name: a.favorite })).toHaveAttribute("aria-pressed", "true"));
  });

  it("sin sesión no pide marcas e invita a iniciar sesión", () => {
    renderWithIntl(<Harness authenticated={false} />);
    openMenu();
    expect(screen.getByText(a.signInPrompt)).toBeInTheDocument();
    expect(mocks.getReleaseGroupMarks).not.toHaveBeenCalled();
  });

  it("las acciones de marcas actualizan el estado local", async () => {
    mocks.getReleaseGroupMarks.mockResolvedValue({ ...MARKS, favorite: false });
    mocks.toggleFavorite.mockResolvedValue({ id: "f1" });
    renderWithIntl(<Harness authenticated />);
    await act(async () => openMenu());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: a.favorite })));
    expect(screen.getByRole("button", { name: a.favorite })).toHaveAttribute("aria-pressed", "true");
  });

  it("muestra las acciones extra de la superficie", async () => {
    mocks.getReleaseGroupMarks.mockResolvedValue(MARKS);
    renderWithIntl(<Harness authenticated extras={<button type="button">Lo busco</button>} />);
    await act(async () => openMenu());
    expect(screen.getByRole("button", { name: "Lo busco" })).toBeInTheDocument();
  });
});
