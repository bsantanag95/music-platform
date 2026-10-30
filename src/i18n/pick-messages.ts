// Subconjunto de los mensajes que se entrega al cliente (openspec:
// trim-client-messages). Las rutas salen de `client-messages.json`, que genera
// `scripts/generate-client-messages.ts`: `"users.settings"` copia ese subárbol,
// `"users.empty*"` copia las claves hermanas que empiezan por `empty` y `""`
// copia todo.

export type Messages = { [key: string]: string | Messages };

/** Copia en `target` lo que `segments` señala dentro de `source`; `false` si no había nada. */
function copyPath(source: Messages, target: Messages, segments: string[]): boolean {
  const [head, ...rest] = segments;
  if (head === undefined) return false;
  const keys = head.endsWith("*")
    ? Object.keys(source).filter((key) => key.startsWith(head.slice(0, -1)))
    : Object.hasOwn(source, head)
      ? [head]
      : [];
  let copied = false;
  for (const key of keys) {
    const value = source[key]!;
    if (rest.length === 0) {
      target[key] = value;
      copied = true;
    } else if (typeof value === "object") {
      const existing = target[key];
      const child: Messages = typeof existing === "object" ? existing : {};
      if (copyPath(value, child, rest)) {
        target[key] = child;
        copied = true;
      }
    }
  }
  return copied;
}

/** Copia de `messages` con solo las rutas pedidas (las que no existen se ignoran). */
export function pickMessages(messages: Messages, paths: readonly string[]): Messages {
  if (paths.includes("")) return messages;
  const result: Messages = {};
  for (const messagePath of paths) copyPath(messages, result, messagePath.split("."));
  return result;
}

/** Fusiona `extra` sobre `base` sin mutarlos; los subárboles se combinan, las hojas de `extra` ganan. */
export function mergeMessages(base: Messages, extra: Messages): Messages {
  const result: Messages = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = result[key];
    result[key] =
      typeof value === "object" && typeof current === "object" ? mergeMessages(current, value) : value;
  }
  return result;
}
