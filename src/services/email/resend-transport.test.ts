import { afterEach, describe, expect, it, vi } from "vitest";
import { createResendTransport } from "./resend-transport";
import { EmailDeliveryError } from "./types";

afterEach(() => {
  vi.unstubAllGlobals();
});

const message = {
  to: "ana@example.com",
  subject: "Tu semana en music-platform",
  text: "Texto plano",
  html: "<p>HTML</p>",
  headers: {
    "List-Unsubscribe": "<https://music.example/api/notifications/unsubscribe?token=tok>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
};

function transport() {
  return createResendTransport({ apiKey: "re_123", from: "music@example.com" });
}

describe("createResendTransport", () => {
  it("hace un único POST a Resend con la clave, el remitente y las cabeceras", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await transport().send(message);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as unknown as [string, { method: string; headers: unknown; body: string }];
    const [url, init] = call;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      Authorization: "Bearer re_123",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body)).toEqual({
      from: "music@example.com",
      to: "ana@example.com",
      subject: "Tu semana en music-platform",
      text: "Texto plano",
      html: "<p>HTML</p>",
      headers: message.headers,
    });
  });

  it("omite las cabeceras cuando el mensaje no las lleva", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await transport().send({ to: "ana@example.com", subject: "Hola", text: "a", html: "b" });

    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body)).not.toHaveProperty("headers");
  });

  it("traduce un error HTTP a EmailDeliveryError con el estado y sin el cuerpo", async () => {
    const body = "el destinatario ana@example.com no existe";
    const text = vi.fn().mockResolvedValue(body);
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 422, text });
    vi.stubGlobal("fetch", fetchMock);

    const error = await transport()
      .send(message)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EmailDeliveryError);
    expect((error as EmailDeliveryError).status).toBe(422);
    expect((error as EmailDeliveryError).message).not.toContain(body);
    expect((error as EmailDeliveryError).message).not.toContain("ana@example.com");
    expect(text).not.toHaveBeenCalled();
  });
});
