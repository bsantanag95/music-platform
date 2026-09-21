import { describe, expect, it } from "vitest";
import { deviceLabelFromUserAgent } from "./device-label";

const UA = {
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  edgeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  operaWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/111.0.0.0",
};

describe("deviceLabelFromUserAgent", () => {
  it.each([
    [UA.chromeWindows, "Chrome · Windows"],
    [UA.edgeWindows, "Edge · Windows"],
    [UA.firefoxLinux, "Firefox · Linux"],
    [UA.safariMac, "Safari · macOS"],
    [UA.safariIphone, "Safari · iPhone"],
    [UA.chromeIphone, "Chrome · iPhone"],
    [UA.chromeAndroid, "Chrome · Android"],
    [UA.operaWindows, "Opera · Windows"],
  ])("deriva la etiqueta de %#", (userAgent, expected) => {
    expect(deviceLabelFromUserAgent(userAgent)).toBe(expected);
  });

  it("devuelve null con un User-Agent vacío, ausente o desconocido", () => {
    expect(deviceLabelFromUserAgent("")).toBeNull();
    expect(deviceLabelFromUserAgent(null)).toBeNull();
    expect(deviceLabelFromUserAgent(undefined)).toBeNull();
    expect(deviceLabelFromUserAgent("curl/8.4.0")).toBeNull();
  });

  it("conserva solo el sistema si no reconoce el navegador", () => {
    expect(deviceLabelFromUserAgent("SomeApp/1.0 (Linux; Android 13)")).toBe("Android");
  });

  it("nunca devuelve el User-Agent completo ni más de 80 caracteres", () => {
    const label = deviceLabelFromUserAgent(UA.chromeWindows);
    expect(label).not.toContain("Mozilla");
    expect(label!.length).toBeLessThanOrEqual(80);
  });
});
