// Presets de duración para una suspensión de actividad social. La UI ofrece
// opciones en vez de un input manual de fecha/hora; el servidor igual valida
// que `expiresAt` sea futura.
export const SUSPENSION_PRESETS = [
  { ms: 24 * 60 * 60 * 1000, key: "24h" },
  { ms: 3 * 24 * 60 * 60 * 1000, key: "3d" },
  { ms: 7 * 24 * 60 * 60 * 1000, key: "1w" },
  { ms: 30 * 24 * 60 * 60 * 1000, key: "1m" },
] as const;

export type SuspensionPresetKey = (typeof SUSPENSION_PRESETS)[number]["key"];

export function expiresAtFromPreset(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}