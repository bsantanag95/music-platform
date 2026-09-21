import { describe, expect, it } from "vitest";
import { buildEmailChangeConfirmEmail, buildEmailChangeNoticeEmail } from "./email-change";
import { buildPasswordChangedEmail } from "./password-changed";

describe("buildEmailChangeConfirmEmail", () => {
  it("arma el enlace de confirmación localizado con el token codificado", () => {
    const message = buildEmailChangeConfirmEmail({
      to: "nuevo@ejemplo.com",
      locale: "en",
      token: "a b/c",
      appUrl: "https://app.test",
    });
    expect(message.to).toBe("nuevo@ejemplo.com");
    expect(message.text).toContain("https://app.test/en/auth/change-email?token=a%20b%2Fc");
    expect(message.subject).toBe("Confirm your new email");
  });

  it("usa español por defecto y escapa el HTML del enlace", () => {
    const message = buildEmailChangeConfirmEmail({
      to: "x@y.com",
      locale: "fr",
      token: "t",
      appUrl: 'https://app.test/"><script>',
    });
    expect(message.subject).toBe("Confirmá tu nuevo email");
    expect(message.html).not.toContain("<script>");
  });
});

describe("buildEmailChangeNoticeEmail", () => {
  it("avisa al email anterior del email nuevo, escapando el HTML", () => {
    const message = buildEmailChangeNoticeEmail({
      to: "ana@example.com",
      locale: "es",
      newEmail: '<b>x</b>@ejemplo.com',
    });
    expect(message.to).toBe("ana@example.com");
    expect(message.text).toContain("<b>x</b>@ejemplo.com");
    expect(message.html).not.toContain("<b>x</b>");
    expect(message.html).toContain("&lt;b&gt;");
  });
});

describe("buildPasswordChangedEmail", () => {
  it("es un aviso sin enlaces ni secretos, en el idioma pedido", () => {
    const es = buildPasswordChangedEmail({ to: "ana@example.com", locale: "es" });
    const en = buildPasswordChangedEmail({ to: "ana@example.com", locale: "en" });
    expect(es.subject).toBe("Cambiaste tu contraseña");
    expect(en.subject).toBe("You changed your password");
    expect(es.text).not.toMatch(/https?:\/\//);
  });
});
