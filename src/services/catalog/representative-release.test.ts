import { describe, it, expect } from "vitest";
import { pickRepresentativeRelease, deriveEditionLabel } from "./representative-release";
import type { MBReleaseSummary } from "../musicbrainz/types";

function rel(overrides: Partial<MBReleaseSummary> & { id: string }): MBReleaseSummary {
  return {
    title: "The Album",
    status: "Official",
    media: [{ "track-count": 10 }],
    ...overrides,
  };
}

describe("pickRepresentativeRelease", () => {
  it("elige el original oficial frente a una reedición deluxe", () => {
    const releases = [
      rel({ id: "deluxe", title: "The Album (Deluxe Edition)", date: "2015-06-01", media: [{ "track-count": 20 }] }),
      rel({ id: "original", date: "1994-09-13" }),
    ];
    expect(pickRepresentativeRelease(releases)?.id).toBe("original");
  });

  it("es indiferente al orden de la lista de entrada (determinismo)", () => {
    const a = rel({ id: "a", date: "1994-09-13" });
    const b = rel({ id: "b", title: "The Album (Remastered)", date: "2011-01-01" });
    const c = rel({ id: "c", date: "1994", country: "JP" });
    const first = pickRepresentativeRelease([a, b, c])?.id;
    const second = pickRepresentativeRelease([c, a, b])?.id;
    const third = pickRepresentativeRelease([b, c, a])?.id;
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it("prefiere una edición con fecha frente a una sin fecha", () => {
    const releases = [
      rel({ id: "nodate", date: undefined }),
      rel({ id: "dated", date: "2000-01-01" }),
    ];
    expect(pickRepresentativeRelease(releases)?.id).toBe("dated");
  });

  it("aplica el ranking aunque ninguna edición sea oficial", () => {
    const releases = [
      rel({ id: "promo-late", status: "Promotion", date: "1999-01-01" }),
      rel({ id: "promo-early", status: "Promotion", date: "1994-01-01" }),
    ];
    expect(pickRepresentativeRelease(releases)?.id).toBe("promo-early");
  });

  it("prefiere el país primario ante empate de estado/fecha/edición", () => {
    const releases = [
      rel({ id: "jp", date: "1994", country: "JP" }),
      rel({ id: "us", date: "1994", country: "US" }),
    ];
    expect(pickRepresentativeRelease(releases)?.id).toBe("us");
  });

  it("desempata de forma estable por mbid", () => {
    const releases = [
      rel({ id: "bbb", date: "1994", country: "US", packaging: "Jewel Case" }),
      rel({ id: "aaa", date: "1994", country: "US", packaging: "Jewel Case" }),
    ];
    expect(pickRepresentativeRelease(releases)?.id).toBe("aaa");
  });

  it("penaliza ediciones con recuento de pistas lejos de la mediana", () => {
    const releases = [
      rel({ id: "standard", date: "1994", country: "US", media: [{ "track-count": 11 }] }),
      rel({ id: "standard-2", date: "1994", country: "US", media: [{ "track-count": 11 }] }),
      rel({ id: "expanded-untagged", date: "1994", country: "US", media: [{ "track-count": 25 }] }),
    ];
    // mediana de oficiales = 11 → la edición de 25 pistas queda última
    expect(pickRepresentativeRelease(releases)?.id).not.toBe("expanded-untagged");
  });

  it("degrada el criterio de pistas cuando no hay recuentos conocidos", () => {
    const releases = [
      rel({ id: "a", date: "1994", country: "US", media: undefined }),
      rel({ id: "b", date: "1994", country: "US", media: undefined }),
    ];
    // sin recuentos: cae al desempate por mbid, sin lanzar
    expect(pickRepresentativeRelease(releases)?.id).toBe("a");
  });

  it("devuelve null para una lista vacía", () => {
    expect(pickRepresentativeRelease([])).toBeNull();
  });
});

describe("deriveEditionLabel", () => {
  it("usa la disambiguation cuando existe", () => {
    expect(deriveEditionLabel(rel({ id: "x", disambiguation: "Japanese edition" }))).toBe(
      "Japanese edition",
    );
  });

  it("usa el sufijo entre paréntesis del título cuando no hay disambiguation", () => {
    expect(
      deriveEditionLabel(rel({ id: "x", title: "The Album (Deluxe Edition)", disambiguation: "" })),
    ).toBe("Deluxe Edition");
  });

  it("cae a 'standard' para una edición sin marcador", () => {
    expect(deriveEditionLabel(rel({ id: "x", title: "The Album", disambiguation: "" }))).toBe(
      "standard",
    );
  });
});
