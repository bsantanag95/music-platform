import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { CeremonyPage } from "@/services/awards/read";

// Páginas de los salones de la fama (openspec: add-hall-of-fame-page): el índice, la página de un salón (redirige a su clase más
// reciente) y la clase. Se inspecciona el árbol de elementos que devuelven los Server Components.

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((): never => {
    throw new Error("NEXT_REDIRECT");
  }),
  notFound: vi.fn((): never => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  listHallOfFameClasses: vi.fn(),
  getAwardKind: vi.fn(),
  getLatestCeremonyYear: vi.fn(),
  getCeremonyPage: vi.fn(),
}));

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue(Object.assign((key: string) => key, { has: () => true })),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/i18n/navigation", () => ({ redirect: mocks.redirect, Link: () => null }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/services/awards/read", () => ({
  listHallOfFameClasses: mocks.listHallOfFameClasses,
  getAwardKind: mocks.getAwardKind,
  getLatestCeremonyYear: mocks.getLatestCeremonyYear,
  getCeremonyPage: mocks.getCeremonyPage,
}));

const { default: HallOfFameIndexPage } = await import("./page");
const { default: HallPage } = await import("./[hall]/page");
const { default: HallClassPage } = await import("./[hall]/[year]/page");
const { HallOfFameTileGrid } = await import("@/components/awards/HallOfFameTile");
const { HallOfFameLatestRail } = await import("@/components/awards/HallOfFameLatestRail");
const { HallOfFameClassView } = await import("@/components/awards/HallOfFameClassView");

function findAll(node: ReactNode, type: unknown, found: ReactElement[] = []): ReactElement[] {
  if (node == null || typeof node !== "object") return found;
  if (Array.isArray(node)) {
    node.forEach((child) => findAll(child, type, found));
    return found;
  }
  if (!isValidElement(node)) return found;
  if (node.type === type) found.push(node);
  findAll((node.props as { children?: ReactNode }).children, type, found);
  return found;
}

const hallClass = (awardSlug: string, year: number) => ({
  awardSlug,
  voting: "jury",
  year,
  edition: null,
  heldOn: `${year}-05-14`,
  years: [year, year - 1],
  inductees: [],
  albumCount: 0,
  recordingCount: 0,
});

const classPage = (over: Partial<CeremonyPage> = {}): CeremonyPage => ({
  awardSlug: "national-recording-registry",
  kind: "hall_of_fame",
  voting: "jury",
  sourceUrl: "https://newsroom.loc.gov/news/x",
  ceremony: { year: 2026, edition: null, heldOn: "2026-05-14" },
  ceremonies: [{ year: 2026, edition: null, heldOn: "2026-05-14" }],
  categories: [],
  ...over,
});

const params = Promise.resolve({ locale: "es" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listHallOfFameClasses.mockResolvedValue([]);
  mocks.getAwardKind.mockResolvedValue("hall_of_fame");
});

describe("/hall-of-fame: índice", () => {
  it("con dos salones: un bloque por salón (datos, clases y riel de la última), sin repetir la clase en tarjetas", async () => {
    mocks.listHallOfFameClasses.mockResolvedValue([hallClass("national-recording-registry", 2026), hallClass("grammy-hall-of-fame", 2026)]);

    const element = await HallOfFameIndexPage({ params });

    expect(findAll(element, HallOfFameTileGrid)).toHaveLength(0);
    expect(findAll(element, HallOfFameLatestRail).map((rail) => (rail.props as { hall: { awardSlug: string } }).hall.awardSlug)).toEqual([
      "national-recording-registry",
      "grammy-hall-of-fame",
    ]);
    expect(JSON.stringify(element)).not.toContain("hall.emptyIndex");
  });

  it("sin salones muestra el mensaje de vacío, sin redirigir ni tarjetas", async () => {
    const element = await HallOfFameIndexPage({ params });

    expect(JSON.stringify(element)).toContain("hall.emptyIndex");
    expect(findAll(element, HallOfFameTileGrid)).toHaveLength(0);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

describe("/hall-of-fame/{salón}", () => {
  const route = (hall: string) => HallPage({ params: Promise.resolve({ locale: "en", hall }) });

  it("redirige a la clase más reciente, en el idioma de la persona", async () => {
    mocks.getLatestCeremonyYear.mockResolvedValue(2026);

    await expect(route("grammy-hall-of-fame")).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.redirect).toHaveBeenCalledWith({ href: "/hall-of-fame/grammy-hall-of-fame/2026", locale: "en" });
  });

  it("un premio competitivo en la ruta de salones es una página no encontrada", async () => {
    mocks.getAwardKind.mockResolvedValue("competition");

    await expect(route("grammy")).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("un salón inexistente o sin clases es una página no encontrada", async () => {
    mocks.getAwardKind.mockResolvedValue(null);
    await expect(route("nada")).rejects.toThrow("NEXT_NOT_FOUND");

    mocks.getAwardKind.mockResolvedValue("hall_of_fame");
    mocks.getLatestCeremonyYear.mockResolvedValue(null);
    await expect(route("vacio")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/hall-of-fame/{salón}/{año}", () => {
  const open = (value: CeremonyPage | null, year = "2026") => {
    mocks.getCeremonyPage.mockResolvedValue(value);
    return HallClassPage({ params: Promise.resolve({ locale: "es", hall: "national-recording-registry", year }) });
  };

  it("muestra la vista de la clase", async () => {
    const element = await open(classPage());

    expect(findAll(element, HallOfFameClassView)).toHaveLength(1);
  });

  it("un premio competitivo, un año sin clase o un año mal formado son páginas no encontradas", async () => {
    await expect(open(classPage({ kind: "competition", awardSlug: "grammy" }))).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(open(null, "1999")).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(open(classPage(), "dos mil")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
