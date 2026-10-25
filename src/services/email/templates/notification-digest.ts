import { createTranslator } from "next-intl";
import esAwards from "../../../../messages/es/awards.json";
import enAwards from "../../../../messages/en/awards.json";
import esCommon from "../../../../messages/es/common.json";
import enCommon from "../../../../messages/en/common.json";
import esNotifications from "../../../../messages/es/notifications.json";
import enNotifications from "../../../../messages/en/notifications.json";
import { notificationText } from "@/lib/notifications/text";
import type { DigestSection, NotificationDigest } from "@/services/notifications/digest";
import type { EmailMessage } from "../types";
import { escapeHtml } from "./escape-html";

// Resumen semanal por email (openspec: add-notification-digest-and-awards, D3).
//
// Los textos son los mismos de la bandeja (`notificationText` sobre
// `messages/{locale}/notifications.json`) y el nombre del premio se localiza
// igual que en la interfaz (`awards.names.<slug>`), para que el correo no diga
// nada distinto de lo que la persona ve en la app. El asunto es neutro: la
// cifra de entradas, sin rachas ni métricas de actividad propia.

type Locale = "es" | "en";

const MESSAGES = {
  es: {
    notifications: esNotifications,
    awards: esAwards,
    app: esCommon.appName,
  },
  en: {
    notifications: enNotifications,
    awards: enAwards,
    app: enCommon.appName,
  },
} as const;

export interface NotificationDigestEmailInput {
  to: string;
  /** Idioma preferido de la persona; cualquier otro valor cae a español. */
  locale: string;
  digest: NotificationDigest;
  /** URL absoluta de la bandeja (`/<locale>/me/notifications`). */
  inboxUrl: string;
  /** Página de confirmación de la baja, con el token. */
  unsubscribeUrl: string;
  /** Endpoint de un clic (RFC 8058), el de la cabecera `List-Unsubscribe`. */
  unsubscribeApiUrl: string;
}

/**
 * Arma el correo del resumen. Devuelve `null` si la ventana no tiene entradas:
 * una semana vacía no se envía y no mueve la marca del resumen.
 */
export function buildNotificationDigestEmail(
  input: NotificationDigestEmailInput,
): EmailMessage | null {
  if (input.digest.total === 0) return null;

  const locale: Locale = input.locale === "en" ? "en" : "es";
  const messages = MESSAGES[locale];
  const t = createTranslator({
    locale,
    messages: messages.notifications,
  });
  // `createTranslator` tipa las claves como el literal del JSON; el resumen
  // compone algunas de forma dinámica (`row.awardWin` + variante de varios
  // artistas). El adaptador queda acotado aquí: las claves reales las cubren
  // las pruebas y `messages.consistency`.
  const translate = t as unknown as (
    key: string,
    values?: Record<string, string | number | Date>,
  ) => string;
  const awardNames = messages.awards.names as Record<string, string>;

  const app = messages.app;
  const count = input.digest.total;
  const subject = t("digest.subject", { app, count });

  const sections = [
    { heading: t("digest.forYou"), section: input.digest.forYou },
    { heading: t("digest.releases"), section: input.digest.releases },
  ].filter(({ section }) => section.total > 0);

  const entryText = (section: DigestSection) =>
    section.entries.map((group) =>
      notificationText(translate, group, locale, {
        awardName: (slug, fallback) => awardNames[slug] ?? fallback,
      }),
    );

  const textLines: string[] = [
    t("digest.heading", { app }),
    "",
    t("digest.intro", { count }),
  ];
  const htmlParts: string[] = [
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(
      t("digest.heading", { app }),
    )}</h1>`,
    `<p style="margin:0 0 20px">${escapeHtml(t("digest.intro", { count }))}</p>`,
  ];

  for (const { heading, section } of sections) {
    const entries = entryText(section);
    textLines.push("", heading, ...entries.map((entry) => `- ${entry}`));
    htmlParts.push(
      `<h2 style="font-size:15px;margin:20px 0 8px">${escapeHtml(heading)}</h2>`,
      `<ul style="margin:0;padding-left:20px">${entries
        .map((entry) => `<li style="margin:0 0 6px">${escapeHtml(entry)}</li>`)
        .join("")}</ul>`,
    );
    if (section.more > 0) {
      const more = t("digest.more", { count: section.more });
      textLines.push(more);
      htmlParts.push(`<p style="margin:6px 0 0;color:#555">${escapeHtml(more)}</p>`);
    }
  }

  textLines.push("", `${t("digest.inbox")}: ${input.inboxUrl}`);
  textLines.push("", t("digest.footer"), `${t("digest.unsubscribe")}: ${input.unsubscribeUrl}`);

  htmlParts.push(
    `<p style="margin:24px 0 0"><a href="${escapeHtml(input.inboxUrl)}">${escapeHtml(
      t("digest.inbox"),
    )}</a></p>`,
    `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px">`,
    `<p style="font-size:12px;color:#666;margin:0">${escapeHtml(t("digest.footer"))}<br>` +
      `<a href="${escapeHtml(input.unsubscribeUrl)}">${escapeHtml(
        t("digest.unsubscribe"),
      )}</a></p>`,
  );

  return {
    to: input.to,
    subject,
    text: textLines.join("\n"),
    html: `<div style="max-width:560px;margin:0 auto;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111">${htmlParts.join(
      "\n",
    )}</div>`,
    headers: {
      "List-Unsubscribe": `<${input.unsubscribeApiUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
