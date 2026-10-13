import { describe, expect, it } from "vitest";
import { encodeId } from "@/lib/slug";
import { presentList } from "./list-presentation";

const ID = "00000000-0000-4000-8000-0000000000c1";
const base = { id: ID, title: "Cumplen años en octubre", owner: { username: "exploracion" } };

describe("presentList", () => {
  it("una colección generada: título del idioma y ruta bajo Explorar, sin la cuenta curadora", () => {
    const generated = { templateKey: "anniversaries", periodKey: "2026-10" };

    expect(presentList({ ...base, generated }, "es")).toEqual({
      title: "Cumplen años en octubre de 2026",
      href: `/explore/collections/cumplen-anos-en-octubre-de-2026-${encodeId(ID)}`,
    });
    expect(presentList({ ...base, generated }, "en")).toEqual({
      title: "Anniversaries in October 2026",
      href: `/explore/collections/anniversaries-in-october-2026-${encodeId(ID)}`,
    });
  });

  it("una lista de una persona conserva su título y su ruta de usuario", () => {
    const result = presentList({ id: ID, title: "Mis discos", owner: { username: "ana" } }, "en");

    expect(result.title).toBe("Mis discos");
    expect(result.href).toBe(`/users/ana/lists/mis-discos-${encodeId(ID)}`);
  });

  it("`generated: null` equivale a una lista normal", () => {
    expect(presentList({ ...base, generated: null }, "en").href).toContain("/users/exploracion/lists/");
  });

  it("una plantilla desconocida usa el título guardado pero igual vive bajo Explorar", () => {
    const result = presentList({ ...base, generated: { templateKey: "ya-no-existe", periodKey: "evergreen" } }, "en");

    expect(result.title).toBe("Cumplen años en octubre");
    expect(result.href.startsWith("/explore/collections/")).toBe(true);
  });
});
