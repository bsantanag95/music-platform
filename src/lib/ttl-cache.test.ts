import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "./ttl-cache";

const make = (load: () => Promise<string>) =>
  createTtlCache<string>({ ttlMs: 1000, load, onError: () => "degradado", errorLabel: "falló" });

describe("createTtlCache", () => {
  it("reutiliza el valor dentro de la vigencia y vuelve a leer al vencer", async () => {
    const load = vi.fn().mockResolvedValue("v");
    const cache = make(load);

    await cache.get(0);
    await cache.get(999);
    expect(load).toHaveBeenCalledTimes(1);

    await cache.get(1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("las llamadas simultáneas comparten una sola lectura", async () => {
    const load = vi.fn().mockResolvedValue("v");
    const cache = make(load);

    const results = await Promise.all([cache.get(), cache.get(), cache.get()]);

    expect(load).toHaveBeenCalledTimes(1);
    expect(results).toEqual(["v", "v", "v"]);
  });

  it("un error no se cachea: devuelve el valor degradado y la próxima llamada reintenta", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue("ok");
    const cache = make(load);

    await expect(cache.get(0)).resolves.toBe("degradado");
    await expect(cache.get(1)).resolves.toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("reset vacía la caché", async () => {
    const load = vi.fn().mockResolvedValue("v");
    const cache = make(load);

    await cache.get(0);
    cache.reset();
    await cache.get(1);

    expect(load).toHaveBeenCalledTimes(2);
  });
});
