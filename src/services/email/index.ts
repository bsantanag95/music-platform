import { consoleTransport } from "./console-transport";
import { createResendTransport } from "./resend-transport";
import type { EmailTransport } from "./types";

export type { EmailMessage, EmailTransport } from "./types";
export { EmailDeliveryError } from "./types";
export { consoleTransport } from "./console-transport";
export { createResendTransport } from "./resend-transport";

/**
 * Error de configuración de email. La ruta de `forgot` lo traduce al contrato
 * `503 EMAIL_CONFIG_MISSING`, análogo a `OAUTH_CONFIG_MISSING`.
 */
export class EmailConfigError extends Error {
  readonly code = "EMAIL_CONFIG_MISSING" as const;

  constructor() {
    super("No hay un transporte de email configurado");
    this.name = "EmailConfigError";
  }
}

/**
 * Devuelve el transporte de email activo según `EMAIL_TRANSPORT`.
 *
 * - `console` (o sin valor): solo en desarrollo; en producción falla cerrado
 *   (fail-closed) para no exponer un flujo que no entrega correo ni filtrar
 *   tokens por logs.
 * - `resend`: exige `RESEND_API_KEY` y `EMAIL_FROM`; sin ellos falla cerrado.
 *
 * Cualquier otro valor es un error de configuración. Un proveedor nuevo se
 * agrega implementando `EmailTransport`.
 */
export function getEmailTransport(): EmailTransport {
  const configured = process.env.EMAIL_TRANSPORT;
  if (!configured || configured === "console") {
    if (process.env.NODE_ENV === "production") throw new EmailConfigError();
    return consoleTransport;
  }
  if (configured === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new EmailConfigError();
    return createResendTransport({ apiKey, from });
  }
  throw new EmailConfigError();
}
