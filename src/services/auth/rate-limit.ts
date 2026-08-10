type Attempt = { at: number };

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const MAX_KEYS = 10_000;
const attempts = new Map<string, Attempt[]>();
let operationsSincePrune = 0;

export function consumeAuthAttempt(keys: string[], now = Date.now()): boolean {
  operationsSincePrune++;
  if (operationsSincePrune >= 100) {
    operationsSincePrune = 0;
    pruneAttempts(now);
  }

  const primaryKey = keys[0];
  if (primaryKey && !consumeKey(primaryKey, now)) return false;

  let allowed = true;
  for (const key of keys.slice(1)) {
    if (!consumeKey(key, now)) allowed = false;
  }
  return allowed;
}

export function clearAuthAttempts(keys?: string[]): void {
  if (!keys) {
    attempts.clear();
    return;
  }
  for (const key of keys) attempts.delete(key);
}

export function getAuthClientIp(headers: Headers, directIp?: string): string {
  if (isUsableIp(directIp)) return directIp;
  if (process.env.AUTH_TRUSTED_PROXY === "1") {
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (isUsableIp(forwarded)) return forwarded;
  }
  return "unknown";
}

function isUsableIp(value: string | undefined): value is string {
  return Boolean(value && value.length <= 128 && !/[\r\n]/.test(value));
}

function pruneAttempts(now: number): void {
  for (const [key, items] of attempts) {
    const recent = items.filter((item) => now - item.at < WINDOW_MS);
    if (recent.length) attempts.set(key, recent);
    else attempts.delete(key);
  }
}

function consumeKey(key: string, now: number): boolean {
  const recent = (attempts.get(key) ?? []).filter((item) => now - item.at < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return false;
  }

  recent.push({ at: now });
  if (attempts.has(key) || attempts.size < MAX_KEYS || admitKey(now)) {
    attempts.set(key, recent);
    return true;
  }

  // No expulsamos claves activas: una clave nueva no puede desplazar el estado existente.
  return false;
}

function admitKey(now: number): boolean {
  for (const [key, items] of attempts) {
    if (!items.some((item) => now - item.at < WINDOW_MS)) {
      attempts.delete(key);
      return true;
    }
  }
  return false;
}
