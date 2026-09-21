import esAuth from "../../../../messages/es/auth.json";
import enAuth from "../../../../messages/en/auth.json";
import type { EmailMessage } from "../types";
import { escapeHtml } from "./escape-html";

// Correos del cambio de email (spec account-credentials): la confirmación al
// email NUEVO y el aviso al email ANTERIOR. Misma fuente de copy que la UI
// (`messages/{locale}/auth.json`), fuera del request scope de next-intl.

const COPY = {
  es: {
    confirm: {
      subject: esAuth.changeEmailConfirmSubject,
      intro: esAuth.changeEmailConfirmIntro,
      cta: esAuth.changeEmailConfirmCta,
      expiry: esAuth.changeEmailConfirmExpiry,
      ignore: esAuth.changeEmailConfirmIgnore,
    },
    notice: {
      subject: esAuth.changeEmailNoticeSubject,
      body: esAuth.changeEmailNoticeBody,
      warning: esAuth.changeEmailNoticeWarning,
    },
  },
  en: {
    confirm: {
      subject: enAuth.changeEmailConfirmSubject,
      intro: enAuth.changeEmailConfirmIntro,
      cta: enAuth.changeEmailConfirmCta,
      expiry: enAuth.changeEmailConfirmExpiry,
      ignore: enAuth.changeEmailConfirmIgnore,
    },
    notice: {
      subject: enAuth.changeEmailNoticeSubject,
      body: enAuth.changeEmailNoticeBody,
      warning: enAuth.changeEmailNoticeWarning,
    },
  },
} as const;

export type EmailChangeConfirmInput = {
  /** El email nuevo: a él se manda el enlace. */
  to: string;
  locale: string;
  token: string;
  appUrl: string;
};

export function buildEmailChangeConfirmEmail(input: EmailChangeConfirmInput): EmailMessage {
  const resolvedLocale = input.locale === "en" ? "en" : "es";
  const copy = COPY[resolvedLocale].confirm;
  const link = `${input.appUrl}/${resolvedLocale}/auth/change-email?token=${encodeURIComponent(input.token)}`;

  const text = [copy.intro, link, copy.expiry, copy.ignore].join("\n\n");
  const html = [
    `<p>${escapeHtml(copy.intro)}</p>`,
    `<p><a href="${escapeHtml(link)}">${escapeHtml(copy.cta)}</a></p>`,
    `<p>${escapeHtml(copy.expiry)}<br>${escapeHtml(copy.ignore)}</p>`,
  ].join("\n");

  return { to: input.to, subject: copy.subject, text, html };
}

export type EmailChangeNoticeInput = {
  /** El email ANTERIOR: se le avisa de que la cuenta ya no es suya. */
  to: string;
  locale: string;
  /** El email nuevo, que se muestra en el aviso. */
  newEmail: string;
};

export function buildEmailChangeNoticeEmail(input: EmailChangeNoticeInput): EmailMessage {
  const resolvedLocale = input.locale === "en" ? "en" : "es";
  const copy = COPY[resolvedLocale].notice;
  const body = copy.body.replace("{email}", input.newEmail);

  const text = [body, copy.warning].join("\n\n");
  const html = `<p>${escapeHtml(body)}</p>\n<p>${escapeHtml(copy.warning)}</p>`;

  return { to: input.to, subject: copy.subject, text, html };
}
