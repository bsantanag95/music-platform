import { consoleTransport } from "./console-transport";
import type { EmailTransport } from "./types";

export type { EmailMessage, EmailTransport } from "./types";
export { consoleTransport } from "./console-transport";

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
 * Solo el adaptador `console` está implementado, y únicamente en desarrollo.
 * En producción, sin un proveedor real configurado, falla cerrado (fail-closed)
 * para no exponer un flujo que no entrega correo ni filtrar tokens por logs.
 * Un proveedor real se agrega implementando `EmailTransport` acá.
 */
export function getEmailTransport(): EmailTransport {
  const configured = process.env.EMAIL_TRANSPORT;
  if (!configured || configured === "console") {
    if (process.env.NODE_ENV === "production") throw new EmailConfigError();
    return consoleTransport;
  }
  throw new EmailConfigError();
}
