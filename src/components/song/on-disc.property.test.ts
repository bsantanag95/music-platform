// @vitest-environment node
// Propiedades de la ventana de «En el disco» (openspec: modernize-song-page-phase2): la pista actual siempre está a la vista, la
// ventana no sale del disco y, en discos largos, mide siempre 11 pistas.

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { ON_DISC_AROUND, ON_DISC_MAX, onDiscRange, onDiscTotal } from "./on-disc";

const discArb = fc.integer({ min: 1, max: 120 }).chain((total) => fc.tuple(fc.constant(total), fc.integer({ min: 0, max: total - 1 })));

describe("onDiscRange", () => {
  it("contiene la pista actual y no sale del disco", () => {
    assertProperty(
      fc.property(discArb, ([total, index]) => {
        const { start, end } = onDiscRange(total, index);
        return start >= 0 && end <= total && start <= index && index < end;
      }),
    );
  });

  it("muestra todo hasta el máximo y una ventana fija por encima", () => {
    assertProperty(
      fc.property(discArb, ([total, index]) => {
        const { start, end } = onDiscRange(total, index);
        return total <= ON_DISC_MAX ? start === 0 && end === total : end - start === ON_DISC_AROUND * 2 + 1;
      }),
    );
  });
});

describe("onDiscTotal", () => {
  it("suma las duraciones conocidas y marca si falta alguna", () => {
    assertProperty(
      fc.property(fc.array(fc.option(fc.integer({ min: 1, max: 1200 }), { nil: null })), (durations) => {
        const total = onDiscTotal(durations);
        const known = durations.filter((d): d is number => d !== null);
        if (known.length === 0) return total === null;
        return total !== null && total.seconds === known.reduce((a, b) => a + b, 0) && total.approximate === known.length < durations.length;
      }),
    );
  });
});
