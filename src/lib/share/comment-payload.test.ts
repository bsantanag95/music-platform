import { describe, expect, it } from "vitest";
import { commentSharePayload } from "./comment-payload";

describe("commentSharePayload", () => {
  const payload = commentSharePayload({ commentId: "c1", locale: "en", title: "Comment by @ana", username: "ana" });

  it("lleva a la dirección propia del comentario", () => {
    expect(payload).toMatchObject({ kind: "comment", ref: "c1", title: "Comment by @ana" });
    expect(new URL(payload.url).pathname).toBe("/en/comment/c1");
  });

  it("pide la imagen sin versión: la ruta responde con caché corta", () => {
    expect(payload.images[0]?.url).toBe("/api/share/image/comment/c1?locale=en&format=link");
  });
});
