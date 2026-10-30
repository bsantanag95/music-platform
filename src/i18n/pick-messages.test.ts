import { describe, expect, it } from "vitest";
import { mergeMessages, pickMessages, type Messages } from "./pick-messages";

const messages: Messages = {
  common: { appName: "App", menu: { open: "Abrir", close: "Cerrar" } },
  users: { emptyBlocks: "Sin bloqueos", emptyFollowers: "Sin seguidores", blocksTitle: "Bloqueos" },
  errors: { NOT_FOUND: { title: "No encontrado", description: "No existe" } },
};

describe("pickMessages", () => {
  it("copia hojas y subárboles pedidos, sin el resto", () => {
    expect(pickMessages(messages, ["common.appName", "errors"])).toEqual({
      common: { appName: "App" },
      errors: messages.errors,
    });
  });

  it("un prefijo con * copia las claves hermanas que empiezan así", () => {
    expect(pickMessages(messages, ["users.empty*"])).toEqual({
      users: { emptyBlocks: "Sin bloqueos", emptyFollowers: "Sin seguidores" },
    });
  });

  it("combina rutas del mismo subárbol e ignora las que no existen", () => {
    expect(pickMessages(messages, ["common.menu.open", "common.menu.close", "common.nada", "nada.x"])).toEqual({
      common: { menu: { open: "Abrir", close: "Cerrar" } },
    });
  });

  it("no baja dentro de una hoja", () => {
    expect(pickMessages(messages, ["common.appName.x"])).toEqual({});
  });

  it("la ruta vacía entrega todo", () => {
    expect(pickMessages(messages, [""])).toBe(messages);
  });
});

describe("mergeMessages", () => {
  it("fusiona subárboles sin mutar las entradas", () => {
    const base: Messages = { common: { appName: "App" }, errors: { A: "a" } };
    const extra: Messages = { common: { menu: { open: "Abrir" } }, users: { title: "Usuarios" } };
    expect(mergeMessages(base, extra)).toEqual({
      common: { appName: "App", menu: { open: "Abrir" } },
      errors: { A: "a" },
      users: { title: "Usuarios" },
    });
    expect(base).toEqual({ common: { appName: "App" }, errors: { A: "a" } });
  });
});
