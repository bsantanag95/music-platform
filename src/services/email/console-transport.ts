import type { EmailMessage, EmailTransport } from "./types";

/**
 * Transporte de desarrollo: escribe el mensaje por consola (incluido el link
 * con el token). `getEmailTransport` lo prohíbe con `NODE_ENV=production` para
 * que un token nunca quede en los logs reales.
 */
export const consoleTransport: EmailTransport = {
  async send(message: EmailMessage): Promise<void> {
    const headers = Object.entries(message.headers ?? {});
    const headerLine =
      headers.length > 0
        ? `Cabeceras: ${headers.map(([name, value]) => `${name}: ${value}`).join(" | ")}\n`
        : "";
    console.log(
      `[email:console] Para: ${message.to} | Asunto: ${message.subject}\n${headerLine}${message.text}\n`,
    );
  },
};
