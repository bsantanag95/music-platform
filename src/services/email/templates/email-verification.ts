import esAuth from "../../../../messages/es/auth.json";
import enAuth from "../../../../messages/en/auth.json";
import type { EmailMessage } from "../types";
import { escapeHtml } from "./escape-html";

type EmailCopy = {
  subject: string;
  intro: string;
  cta: string;
  expiry: string;
  ignore: string;
};

// Misma fuente de copy que la UI (`messages/{locale}/auth.json`), fuera del
// request scope de next-intl, igual que la plantilla de reset.
const COPY = {
  es: {
    subject: esAuth.verifyEmailSubject,
    intro: esAuth.verifyEmailIntro,
    cta: esAuth.verifyEmailCta,
    expiry: esAuth.verifyEmailExpiry,
    ignore: esAuth.verifyEmailIgnore,
  },
  en: {
    subject: enAuth.verifyEmailSubject,
    intro: enAuth.verifyEmailIntro,
    cta: enAuth.verifyEmailCta,
    expiry: enAuth.verifyEmailExpiry,
    ignore: enAuth.verifyEmailIgnore,
  },
} satisfies Record<"es" | "en", EmailCopy>;

export type EmailVerificationEmailInput = {
  to: string;
  locale: string;
  token: string;
  appUrl: string;
};

export function buildEmailVerificationEmail(input: EmailVerificationEmailInput): EmailMessage {
  const resolvedLocale = input.locale === "en" ? "en" : "es";
  const copy = resolvedLocale === "en" ? COPY.en : COPY.es;
  const link = `${input.appUrl}/${resolvedLocale}/auth/verify-email?token=${encodeURIComponent(
    input.token,
  )}`;

  const text = [copy.intro, link, copy.expiry, copy.ignore].join("\n\n");
  const html = [
    `<p>${escapeHtml(copy.intro)}</p>`,
    `<p><a href="${escapeHtml(link)}">${escapeHtml(copy.cta)}</a></p>`,
    `<p>${escapeHtml(copy.expiry)}<br>${escapeHtml(copy.ignore)}</p>`,
  ].join("\n");

  return { to: input.to, subject: copy.subject, text, html };
}
