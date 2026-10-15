import { describe, expect, it } from "vitest";
import { formatContextDate, renderContext, renderRef, type ContextTranslator } from "./collection-context-render";
import type { CollectionContext } from "@/services/discovery/collections/presenters/types";

// Traductor mínimo: `{nombre}` se sustituye y `has` mira un catálogo pequeño.
function translator(messages: Record<string, string>): ContextTranslator {
  const t = ((key: string, values: Record<string, string | number> = {}) =>
    messages[key]!.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name]))) as ContextTranslator;
  t.has = (key: string) => key in messages;
  return t;
}

const t = translator({
  year: "{year}",
  anniversary: "Cumple {years} años · {date}",
  awardsWon2: "{a} · {b}",
  monthHeading: "{month}",
  summary: "Resumen",
});

const items = [
  { id: "i1", target: { id: "a" } },
  { id: "i2", target: { id: "b" } },
  { id: "i3", target: { id: "c" } },
];

describe("formatContextDate", () => {
  it("formatea en UTC con el idioma activo, sin correr el día", () => {
    expect(formatContextDate({ date: "2025-02-02", style: "long" }, "es")).toBe("2 de febrero de 2025");
    expect(formatContextDate({ date: "2025-02-02", style: "long" }, "en")).toBe("February 2, 2025");
    expect(formatContextDate({ date: "1956-10-15", style: "short" }, "es")).toBe("15 oct 1956");
    expect(formatContextDate({ date: "2026-10-09", style: "day-month" }, "es")).toBe("9 oct");
  });

  it("el mes suelto de un encabezado empieza en mayúscula", () => {
    expect(formatContextDate({ date: "2026-10-01", style: "month-year" }, "es")).toBe("Octubre de 2026");
    expect(formatContextDate({ date: "2026-10-01", style: "month-year" }, "en")).toBe("October 2026");
  });
});

describe("renderRef", () => {
  it("traduce la clave con sus parámetros: números, fechas y textos en los dos idiomas", () => {
    const ref = { key: "anniversary", params: { years: 70, date: { date: "1956-10-15", style: "short" as const } } };
    expect(renderRef(ref, t, "es")).toBe("Cumple 70 años · 15 oct 1956");

    const names = { key: "awardsWon2", params: { a: { es: "Álbum del año", en: "Album of the Year" }, b: "Otra" } };
    expect(renderRef(names, t, "es")).toBe("Álbum del año · Otra");
    expect(renderRef(names, t, "en")).toBe("Album of the Year · Otra");
  });

  it("una clave inexistente no se muestra cruda: devuelve null", () => {
    expect(renderRef({ key: "no-existe" }, t, "es")).toBeNull();
    expect(renderRef(undefined, t, "es")).toBeNull();
  });
});

describe("renderContext", () => {
  const context = (over: Partial<CollectionContext> = {}): CollectionContext => ({
    summary: { key: "summary" },
    notes: new Map([
      ["a", { key: "year", params: { year: "2024" } }],
      ["b", { key: "no-existe" }],
      ["zzz", { key: "year", params: { year: "1999" } }],
    ]),
    numbered: false,
    ...over,
  });

  it("devuelve el resumen y la cartela por id de ítem, omitiendo las claves inexistentes y los discos ajenos", () => {
    const rendered = renderContext(context(), { t, locale: "es", items });

    expect(rendered.summary).toBe("Resumen");
    expect(rendered.notes).toEqual({ i1: "2024" });
    expect(rendered.groups).toBeNull();
    expect(rendered.numbered).toBe(false);
  });

  it("resuelve el enlace y lo omite si su etiqueta no existe", () => {
    const withLink = context({ link: { href: "/awards/grammy/2025", label: { key: "summary" } } });
    expect(renderContext(withLink, { t, locale: "es", items }).link).toEqual({ href: "/awards/grammy/2025", label: "Resumen" });

    const broken = context({ link: { href: "/x", label: { key: "no-existe" } } });
    expect(renderContext(broken, { t, locale: "es", items }).link).toBeUndefined();
  });

  it("pinta los grupos con su encabezado y sus ítems; un grupo sin encabezado no lo lleva", () => {
    const grouped = context({
      groups: [
        { label: { key: "monthHeading", params: { month: { date: "2026-10-01", style: "month-year" as const } } }, albumIds: ["a", "c"] },
        { albumIds: ["b"] },
      ],
    });
    const { groups } = renderContext(grouped, { t, locale: "es", items });

    expect(groups).toEqual([
      { heading: "Octubre de 2026", items: [items[0], items[2]] },
      { items: [items[1]] },
    ]);
  });

  it("mantiene la numeración que pide el contexto", () => {
    expect(renderContext(context({ numbered: true }), { t, locale: "es", items }).numbered).toBe(true);
  });
});
