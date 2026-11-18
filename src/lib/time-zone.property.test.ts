// @vitest-environment node
// Propiedades de la zona horaria del usuario (cookie `tz` y parámetro `tz` del diario).

import { describe, it } from "vitest";
import { assertProperty, fc } from "@/test/property";
import { parseTimeZone } from "./time-zone";

const KNOWN_ZONES = [...Intl.supportedValuesOf("timeZone"), "UTC", "Etc/GMT+3", "America/Santiago"];

describe("parseTimeZone", () => {
  it("nunca lanza ante basura y solo devuelve null o un nombre sin espacios", () => {
    assertProperty(
      fc.property(fc.oneof(fc.string({ maxLength: 80 }), fc.constant(null), fc.constant(undefined)), (value) => {
        const out = parseTimeZone(value);
        return out === null || (out.length > 0 && !/\s/.test(out));
      }),
    );
  });

  it("es idempotente: el nombre canónico vuelve a ser el mismo", () => {
    assertProperty(
      fc.property(fc.oneof(fc.constantFrom(...KNOWN_ZONES), fc.string({ maxLength: 40 })), (value) => {
        const once = parseTimeZone(value);
        return once === null || parseTimeZone(once) === once;
      }),
    );
  });

  it("acepta toda zona IANA conocida, sin distinguir mayúsculas", () => {
    assertProperty(
      fc.property(fc.constantFrom(...KNOWN_ZONES), (zone) => {
        return parseTimeZone(zone) !== null && parseTimeZone(zone.toLowerCase()) !== null;
      }),
    );
  });

  it("rechaza los desplazamientos sueltos (Postgres los interpreta con el signo POSIX invertido)", () => {
    assertProperty(
      fc.property(fc.constantFrom("+", "-"), fc.integer({ min: 0, max: 14 }), fc.integer({ min: 0, max: 59 }), (sign, h, m) => {
        const offset = `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        return parseTimeZone(offset) === null;
      }),
    );
  });
});
