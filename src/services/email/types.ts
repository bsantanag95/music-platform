export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Cabeceras adicionales (`List-Unsubscribe`, `List-Unsubscribe-Post`). El
   * adaptador de consola las imprime; Resend las reenvía tal cual.
   */
  headers?: Record<string, string>;
};

export interface EmailTransport {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Error de entrega del proveedor de email. Nunca lleva el cuerpo de la
 * respuesta: puede repetir el destinatario y el contenido del mensaje.
 */
export class EmailDeliveryError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`El proveedor de email respondió ${status}`);
    this.name = "EmailDeliveryError";
    this.status = status;
  }
}
