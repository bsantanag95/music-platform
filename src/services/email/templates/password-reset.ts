import esAuth from "../../../../messages/es/auth.json";
import enAuth from "../../../../messages/en/auth.json";
import type { EmailMessage } from "../types";

type EmailCopy = {
  subject: string;
  intro: string;
  cta: string;
  expiry: string;
  ignore: string;
};

// La copy vive en `messages/{locale}/auth.json` (misma fuente que la UI y
// cubierta por el test de consistencia de claves). El correo no pasa por
// next-intl porque se renderiza fuera del request scope de las páginas.
const COPY = {
  es: {
    subject: esAuth.resetEmailSubject,
    intro: esAuth.resetEmailIntro,
    cta: esAuth.resetEmailCta,
    expiry: esAuth.resetEmailExpiry,
    ignore: esAuth.resetEmailIgnore,
  },
  en: {
    subject: enAuth.resetEmailSubject,
    intro: enAuth.resetEmailIntro,
    cta: enAuth.resetEmailCta,
    expiry: enAuth.resetEmailExpiry,
    ignore: enAuth.resetEmailIgnore,
  },
} satisfies Record<"es" | "en", EmailCopy>;

export type PasswordResetEmailInput = {
  to: string;
  locale: string;
  token: string;
  appUrl: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): EmailMessage {
  const resolvedLocale = input.locale === "en" ? "en" : "es";
  const copy = resolvedLocale === "en" ? COPY.en : COPY.es;
  const link = `${input.appUrl}/${resolvedLocale}/auth/reset-password?token=${encodeURIComponent(
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
