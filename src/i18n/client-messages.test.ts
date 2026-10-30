// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { analyzeClientMessages, coversPath, normalizePaths, type Analysis } from "./client-messages-analysis";
import { MANIFEST_PATH, serializeManifest } from "./client-messages-manifest";
import { pickMessages, type Messages } from "./pick-messages";

// Los textos que recibe el cliente salen de `client-messages.json` (openspec:
// trim-client-messages). Si un componente cliente empieza a usar una clave y el
// archivo no se regenera, esa clave falta en el navegador (MISSING_MESSAGE) sin que
// lo note ni tsc ni el resto de las pruebas, que cargan todos los mensajes. Esta
// prueba corre el mismo análisis que el generador y exige que el archivo esté al día.

const root = process.cwd();

function loadMessages(locale: string): Messages {
  const dir = path.join(root, "messages", locale);
  const messages: Messages = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    messages[file.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as Messages;
  }
  return messages;
}

describe("coversPath / normalizePaths", () => {
  it("una ruta general cubre sus hojas y un prefijo con * a sus hermanas", () => {
    expect(coversPath("users", "users.title")).toBe(true);
    expect(coversPath("users", "usersX.title")).toBe(false);
    expect(coversPath("users.empty*", "users.emptyBlocks")).toBe(true);
    expect(coversPath("", "cualquier.cosa")).toBe(true);
    expect(normalizePaths(["users.title", "users", "common.a", "common.a"])).toEqual(["common.a", "users"]);
  });
});

describe("client-messages.json", () => {
  let analysis: Analysis;
  // Arma un programa de TypeScript sobre todas las rutas: unos 15 s.
  beforeAll(() => {
    analysis = analyzeClientMessages(root);
  }, 180_000);

  it("las rutas declaran sus proveedores según la convención", () => {
    expect(analysis.problems, analysis.problems.join("\n")).toEqual([]);
  });

  it("está al día con el código (si falla: pnpm run i18n:client-messages)", () => {
    const current = fs.readFileSync(path.join(root, MANIFEST_PATH), "utf-8").replaceAll("\r\n", "\n");
    expect(current).toBe(serializeManifest(analysis));
  });

  it("el análisis encuentra claves conocidas de la cabecera y de una página", () => {
    const byScope = Object.fromEntries(analysis.scopes.map((s) => [s.scope, s.paths]));
    expect(byScope.layout).toContain("common.login");
    expect(byScope.layout).toContain("notifications.bell.label");
    expect(byScope["me/settings/(screens)/profile/page"]?.some((p) => p.startsWith("users.avatar."))).toBe(true);
  });

  it("el layout raíz entrega bastante menos que todos los mensajes", () => {
    const es = loadMessages("es");
    const layout = analysis.scopes.find((s) => s.scope === "layout")!;
    const size = JSON.stringify(pickMessages(es, layout.paths)).length;
    expect(size).toBeLessThan(JSON.stringify(es).length / 4);
  });
});
