import { EmailDeliveryError } from "./types";
import type { EmailMessage, EmailTransport } from "./types";

/**
 * Único punto de salida a Resend (openspec:
 * add-notification-digest-and-awards, D1), con el mismo criterio que los
 * clientes de MusicBrainz, Wikimedia y ListenBrainz: un solo módulo construye
 * la request y nadie más habla con el proveedor.
 *
 * Un error HTTP se traduce a `EmailDeliveryError` con el estado; el cuerpo de
 * la respuesta no se lee ni se registra, porque puede repetir el destinatario y
 * el contenido del email.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type ResendConfig = {
  apiKey: string;
  from: string;
};

export function createResendTransport(config: ResendConfig): EmailTransport {
  return {
    async send(message: EmailMessage): Promise<void> {
      const response = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
          ...(message.headers ? { headers: message.headers } : {}),
        }),
      });
      if (!response.ok) throw new EmailDeliveryError(response.status);
    },
  };
}
