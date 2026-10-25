import { afterEach, describe, expect, it, vi } from "vitest";
import enAuth from "../../../messages/en/auth.json";
import { EmailConfigError, getEmailTransport } from "./index";
import { buildEmailVerificationEmail } from "./templates/email-verification";
import { buildPasswordResetEmail } from "./templates/password-reset";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getEmailTransport", () => {
  it("devuelve el adaptador console en desarrollo sin proveedor configurado", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_TRANSPORT", "");
    expect(getEmailTransport()).toBeDefined();
  });

  it("falla cerrado en producción sin transporte real", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_TRANSPORT", "");
    expect(() => getEmailTransport()).toThrow(EmailConfigError);
  });

  it("falla cerrado con un proveedor no implementado", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EMAIL_TRANSPORT", "smtp");
    expect(() => getEmailTransport()).toThrow(EmailConfigError);
  });

  it("exige RESEND_API_KEY y EMAIL_FROM con EMAIL_TRANSPORT=resend", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "music@example.com");
    expect(() => getEmailTransport()).toThrow(EmailConfigError);

    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("EMAIL_FROM", "");
    expect(() => getEmailTransport()).toThrow(EmailConfigError);
  });

  it("devuelve el adaptador de Resend con la configuración completa", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    vi.stubEnv("RESEND_API_KEY", "re_123");
    vi.stubEnv("EMAIL_FROM", "music@example.com");
    expect(getEmailTransport()).toBeDefined();
  });
});

describe("buildPasswordResetEmail", () => {
  it("compone asunto, texto y HTML con el link localizado", () => {
    const email = buildPasswordResetEmail({
      to: "user@example.com",
      locale: "en",
      token: "tok-123",
      appUrl: "https://music.example",
    });
    expect(email.to).toBe("user@example.com");
    expect(email.subject).toBe(enAuth.resetEmailSubject);
    expect(email.text).toContain("https://music.example/en/auth/reset-password?token=tok-123");
    expect(email.html).toContain('href="https://music.example/en/auth/reset-password?token=tok-123"');
  });

  it("cae a español ante un locale no soportado", () => {
    const email = buildPasswordResetEmail({
      to: "user@example.com",
      locale: "fr",
      token: "tok-123",
      appUrl: "https://music.example",
    });
    expect(email.text).toContain("https://music.example/es/auth/reset-password?token=tok-123");
  });
});

describe("buildEmailVerificationEmail", () => {
  it("compone asunto, texto y HTML con el link localizado", () => {
    const email = buildEmailVerificationEmail({
      to: "user@example.com",
      locale: "en",
      token: "tok-123",
      appUrl: "https://music.example",
    });
    expect(email.to).toBe("user@example.com");
    expect(email.subject).toBe(enAuth.verifyEmailSubject);
    expect(email.text).toContain("https://music.example/en/auth/verify-email?token=tok-123");
    expect(email.html).toContain('href="https://music.example/en/auth/verify-email?token=tok-123"');
  });

  it("cae a español ante un locale no soportado", () => {
    const email = buildEmailVerificationEmail({
      to: "user@example.com",
      locale: "pt",
      token: "tok-123",
      appUrl: "https://music.example",
    });
    expect(email.text).toContain("https://music.example/es/auth/verify-email?token=tok-123");
  });

  it("escapa el HTML del link", () => {
    const email = buildEmailVerificationEmail({
      to: "user@example.com",
      locale: "es",
      token: "tok-123",
      appUrl: 'https://music.example/a"b<c',
    });
    expect(email.html).toContain("&quot;");
    expect(email.html).toContain("&lt;");
    expect(email.html).not.toContain('href="https://music.example/a"b<c');
  });
});
