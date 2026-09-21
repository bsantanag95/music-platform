import esAuth from "../../../../messages/es/auth.json";
import enAuth from "../../../../messages/en/auth.json";
import type { EmailMessage } from "../types";
import { escapeHtml } from "./escape-html";

// Aviso de que la contraseña se cambió o se creó (spec account-credentials):
// da tiempo a reaccionar si no fue la persona.

const COPY = {
  es: {
    subject: esAuth.passwordChangedSubject,
    body: esAuth.passwordChangedBody,
    warning: esAuth.passwordChangedWarning,
  },
  en: {
    subject: enAuth.passwordChangedSubject,
    body: enAuth.passwordChangedBody,
    warning: enAuth.passwordChangedWarning,
  },
} as const;

export type PasswordChangedInput = { to: string; locale: string };

export function buildPasswordChangedEmail(input: PasswordChangedInput): EmailMessage {
  const copy = COPY[input.locale === "en" ? "en" : "es"];
  const text = [copy.body, copy.warning].join("\n\n");
  const html = `<p>${escapeHtml(copy.body)}</p>\n<p>${escapeHtml(copy.warning)}</p>`;
  return { to: input.to, subject: copy.subject, text, html };
}
