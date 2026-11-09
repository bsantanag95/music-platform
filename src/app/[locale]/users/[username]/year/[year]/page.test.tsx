import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  year: vi.fn(),
  metadata: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const messages = (await import("../../../../../../../messages/es/laminas.json")).default;
  return {
    getLocale: vi.fn().mockResolvedValue("es"),
    getTimeZone: vi.fn().mockResolvedValue("America/Santiago"),
    getTranslations: vi.fn(async (namespace: string) => createTranslator({ locale: "es", messages: { laminas: messages }, namespace: namespace as "laminas" })),
  };
});
vi.mock("@/services/auth/sessions", () => ({ resolveSession: mocks.session }));
vi.mock("@/services/laminas/year", () => ({
  getYearInDiscs: mocks.year,
  parseYear: (value: string) => (/^\d{4}$/.test(value) && Number(value) >= 2000 && Number(value) <= 2100 ? Number(value) : null),
}));
vi.mock("@/services/share/metadata", () => ({ buildShareMetadata: mocks.metadata }));
vi.mock("@/services/share/targets/year", () => ({ yearRef: (user: string, year: number) => `${user}.${year}`, yearRefFor: vi.fn(async () => "u1.2026") }));
vi.mock("@/i18n/client-messages", () => ({ withClientMessages: (_route: string, page: unknown) => page }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/components/catalog/CoverThumb", () => ({ CoverThumb: ({ label }: { label: string }) => <span>{label}</span> }));
vi.mock("@/components/share/OwnShareSheet", () => ({ OwnShareButton: ({ refId }: { refId: string }) => <button>{`propio:${refId}`}</button> }));
vi.mock("@/components/laminas/YearCuration", () => ({
  YearTopEditor: ({ top }: { top: { title: string }[] }) => <div>{`editor:${top.map((disc) => disc.title).join(",")}`}</div>,
  YearHideButton: ({ disc }: { disc: { title: string } }) => <button>{`ocultar:${disc.title}`}</button>,
  YearHiddenList: ({ hidden }: { hidden: { title: string }[] }) => <div>{`ocultos:${hidden.length}`}</div>,
}));
vi.mock("@/components/share/ShareAction", () => ({ ShareAction: ({ refId }: { refId: string }) => <button>{`publico:${refId}`}</button> }));

import UserYearPage, { generateMetadata } from "./page";

const disc = (n: number, listens = 1) => ({ id: `d${n}`, title: `Disco ${n}`, artistName: "Banda", coverThumbUrl: null, listens });
const months = () => Array.from({ length: 12 }, (_, i) => ({ month: i + 1, discs: i === 2 ? [disc(1, 2), disc(2)] : [] }));
const data = (over = {}) => ({
  year: 2026,
  months: months(),
  stats: { listens: 14, discs: 2, newDiscs: 1, artistsDiscovered: 1 },
  top: [disc(1, 2), disc(2)],
  topIsCustom: false,
  choices: [],
  hidden: [],
  owner: { id: "u1", username: "ana", displayName: null },
  isOwner: false,
  shared: true,
  inProgress: false,
  timeZone: "America/Santiago",
  ...over,
});

const render = async (year = "2026") => renderWithIntl(await UserYearPage({ params: Promise.resolve({ username: "ana", year }) }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue(null);
  mocks.year.mockResolvedValue(data());
});

describe("Tu año en discos", () => {
  it("muestra los doce meses, los discos de cada uno y las cifras, sin escuchas", async () => {
    await render();
    expect(screen.getByRole("heading", { level: 1, name: "2026 en discos" })).toBeInTheDocument();
    // Doce meses más "Mi Top 5".
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(13);
    const march = screen.getByRole("list", { name: "marzo: 2 discos" });
    expect(within(march).getAllByRole("link").map((link) => link.getAttribute("title"))).toEqual(["Disco 1 · Banda", "Disco 2 · Banda"]);
    expect(screen.getAllByText("Sin discos este mes.")).toHaveLength(11);
    expect(screen.getByText("Escuchas").nextSibling).toHaveTextContent("14");
    expect(screen.getByText("Artistas descubiertos").nextSibling).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "publico:u1.2026" })).toBeInTheDocument();
    expect(mocks.year).toHaveBeenCalledWith("ana", 2026, null, "America/Santiago");
  });

  it("el año en curso dice hasta ahora; el dueño tiene su botón propio", async () => {
    mocks.session.mockResolvedValue({ user: { id: "u1", username: "ana" } });
    mocks.year.mockResolvedValue(data({ isOwner: true, shared: false, inProgress: true }));
    await render();
    expect(screen.getByRole("heading", { level: 1, name: "2026 en discos, hasta ahora" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "propio:u1.2026" })).toBeInTheDocument();
  });

  it("un año que no se puede ver o sin escuchas responde 404", async () => {
    mocks.year.mockResolvedValue(null);
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("un año inválido responde 404 sin leer nada", async () => {
    await expect(render("1999")).rejects.toThrow("NOT_FOUND");
    expect(mocks.year).not.toHaveBeenCalled();
  });

  it("los metadatos son los del año", async () => {
    await generateMetadata({ params: Promise.resolve({ username: "ana", year: "2026" }) });
    expect(mocks.metadata).toHaveBeenCalledWith("year", "u1.2026", "es", { withTitle: true });
  });

  it("los demás ven el Top 5 sin controles; el dueño, su editor, ocultar y sus ocultos", async () => {
    await render();
    expect(screen.getByRole("heading", { level: 2, name: "Mi Top 5" })).toBeInTheDocument();
    expect(screen.queryByText(/^editor:/)).toBeNull();
    expect(screen.queryByRole("button", { name: /^ocultar:/ })).toBeNull();
    mocks.session.mockResolvedValue({ user: { id: "u1", username: "ana" } });
    mocks.year.mockResolvedValue(data({ isOwner: true, hidden: [disc(9)] }));
    await render();
    expect(screen.getByText("editor:Disco 1,Disco 2")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^ocultar:/ })).toHaveLength(2);
    expect(screen.getByText("ocultos:1")).toBeInTheDocument();
  });
});
