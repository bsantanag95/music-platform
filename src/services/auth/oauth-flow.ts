import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { routing } from "@/i18n/routing";

export const OAUTH_STATE_COOKIE = "oauth_state";
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthFlowState {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
  nonce: string;
  locale: string;
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

export function generateOAuthFlowState(locale?: string): OAuthFlowState {
  const state = generateState();
  const nonce = generateNonce();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = computeCodeChallenge(codeVerifier);
  return { state, nonce, codeVerifier, codeChallenge, locale: resolveLocale(locale) };
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
    return { ...parsed, locale: resolveLocale(parsed.locale) };
  } catch {
    return null;
  }
}
