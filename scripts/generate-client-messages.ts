// Genera `src/i18n/client-messages.json`: qué rutas de mensajes entrega al cliente
// cada proveedor de textos (openspec: trim-client-messages). Correr tras tocar un
// componente cliente que use `useTranslations`, o al declarar un proveedor nuevo:
//
//   pnpm run i18n:client-messages
//
// `--check` no escribe: falla si el archivo quedó viejo (lo mismo que la prueba
// `src/i18n/client-messages.test.ts`). Imprime el tamaño de cada proveedor y los
// usos que no se pudieron acotar a una clave.
import * as fs from "fs";
import * as path from "path";
import { analyzeClientMessages } from "../src/i18n/client-messages-analysis";
import { serializeManifest, MANIFEST_PATH } from "../src/i18n/client-messages-manifest";
import { pickMessages, type Messages } from "../src/i18n/pick-messages";

const root = process.cwd();
const check = process.argv.includes("--check");

function loadMessages(locale: string): Messages {
  const dir = path.join(root, "messages", locale);
  const messages: Messages = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    messages[file.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8")) as Messages;
  }
  return messages;
}

const analysis = analyzeClientMessages(root);
if (analysis.problems.length > 0) {
  console.error("Problemas:\n" + analysis.problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}

const es = loadMessages("es");
const en = loadMessages("en");
const kb = (messages: Messages, paths: string[]) => (JSON.stringify(pickMessages(messages, paths)).length / 1024).toFixed(1);
console.log(`Mensajes completos: es ${kb(es, [""])} KB, en ${kb(en, [""])} KB`);
for (const { scope, paths } of analysis.scopes) {
  console.log(`  ${scope.padEnd(64)} es ${kb(es, paths).padStart(5)} KB  en ${kb(en, paths).padStart(5)} KB`);
}
const wide = analysis.fallbacks.filter((f) => f.path !== "errors");
if (wide.length > 0) {
  console.log("Usos entregados enteros (namespace o prefijo; `errors` se omite, sus códigos vienen de la API):");
  for (const { path: messagePath, location } of wide) console.log(`  ${(messagePath || "(todo)").padEnd(36)} ${location}`);
}

const output = serializeManifest(analysis);
const target = path.join(root, MANIFEST_PATH);
// Con `core.autocrlf` el archivo puede estar con CRLF en disco: se compara sin eso.
const current = fs.existsSync(target) ? fs.readFileSync(target, "utf-8").split("\r\n").join("\n") : "";
if (check) {
  if (current !== output) {
    console.error(`${MANIFEST_PATH} está desactualizado: correr pnpm run i18n:client-messages`);
    process.exit(1);
  }
  console.log(`${MANIFEST_PATH} al día.`);
} else if (current !== output) {
  fs.writeFileSync(target, output);
  console.log(`${MANIFEST_PATH} actualizado.`);
} else {
  console.log(`${MANIFEST_PATH} sin cambios.`);
}
