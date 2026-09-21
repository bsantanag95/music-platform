import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { routing } from "@/i18n/routing";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// Intención del flujo (spec google-oauth, "Intenciones del flujo con retorno
// fijo"): valor CERRADO. `login` es el flujo de siempre; `link` vincula Google a
// la cuenta de la sesión; `reauth` confirma la identidad para una acción
// sensible. Cualquier otro valor se trata como `login`.
export const OAUTH_INTENTS = ["login", "link", "reauth"] as const;
export type OAuthIntent = (typeof OAUTH_INTENTS)[number];

export function resolveIntent(value: string | null | undefined): OAuthIntent {
  return OAUTH_INTENTS.includes(value as OAuthIntent) ? (value as OAuthIntent) : "login";
}

/** ¿La intención opera sobre una cuenta ya autenticada (necesita sesión)? */
export function isAccountIntent(intent: OAuthIntent): boolean {
  return intent === "link" || intent === "reauth";
}

export interface OAuthFlowState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  locale: string;
  intent: OAuthIntent;
  /** Quién inició un flujo `link`/`reauth`; el callback exige que sea la misma sesión. */
  userId?: string;
}

export function resolveLocale(value: string | null | undefined): string {
  const candidate = value ?? routing.defaultLocale;
  return routing.locales.includes(candidate as (typeof routing.locales)[number])
    ? candidate
    : routing.defaultLocale;
}

export function generateState(): string {
  return randomBytes(32).toString("base64url");
}

export function generateNonce(): string {
  return randomBytes(16).toString("base64url");
}

export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function computeCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function generateOAuthFlowState(
  locale?: string,
  account?: { intent: OAuthIntent; userId: string },
): OAuthFlowState {
  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  return {
    state,
    nonce,
    codeVerifier,
    codeChallenge,
    locale: resolveLocale(locale),
    intent: account?.intent ?? "login",
    ...(account ? { userId: account.userId } : {}),
  };
}

export async function setOAuthFlowCookies(flowState: OAuthFlowState): Promise<void> {
  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: OAUTH_STATE_TTL_MS / 1000,
  };
  const store = await cookies();
  store.set(OAUTH_STATE_COOKIE, JSON.stringify(flowState), cookieOpts);
}

export async function consumeOAuthFlowCookies(): Promise<OAuthFlowState | null> {
  const store = await cookies();
  const raw = store.get(OAUTH_STATE_COOKIE)?.value;
  store.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OAuthFlowState;
    if (!parsed.state || !parsed.codeVerifier || !parsed.nonce) return null;
    // Una cookie anterior a las intenciones no trae `intent`: es un login.
    return { ...parsed, locale: resolveLocale(parsed.locale), intent: resolveIntent(parsed.intent) };
  } catch {
    return null;
  }
}
