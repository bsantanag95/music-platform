// Etiqueta legible del dispositivo de una sesión ("Chrome · Windows") derivada
// del User-Agent. Es lo ÚNICO que se guarda del dispositivo: ni el User-Agent
// completo ni la IP (spec session-management). Sin dependencias: un puñado de
// navegadores y sistemas comunes, y `null` cuando no se reconoce ninguno (la
// interfaz lo muestra como "Dispositivo desconocido", localizado).

const MAX_LABEL_LENGTH = 80;

// El orden importa: Edge, Opera y los navegadores de iOS incluyen "Chrome" o
// "Safari" en su User-Agent, así que se prueban antes.
const BROWSERS: ReadonlyArray<readonly [RegExp, string]> = [
  [/Edg(?:e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

// iPhone/iPad antes que macOS: su User-Agent también dice "like Mac OS X".
const SYSTEMS: ReadonlyArray<readonly [RegExp, string]> = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux|X11/, "Linux"],
];

function firstMatch(userAgent: string, table: ReadonlyArray<readonly [RegExp, string]>): string | null {
  for (const [pattern, name] of table) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

export function deviceLabelFromUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = firstMatch(userAgent, BROWSERS);
  const system = firstMatch(userAgent, SYSTEMS);
  const parts = [browser, system].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  return parts.join(" · ").slice(0, MAX_LABEL_LENGTH);
}
