import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UNDO_TOAST_MS } from "@/components/ui/UndoToast";
import { renderWithIntl } from "@/test/i18n-test-utils";

const mocks = vi.hoisted(() => ({ payload: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/api/share", () => ({ getSharePayload: mocks.payload, postShareEvent: mocks.post }));

import { LazyShareSheet } from "./LazyShareSheet";
import { ShareOfferToast } from "./ShareOfferToast";

const payload = {
  kind: "review" as const,
  ref: "r1",
  url: "https://ejemplo.app/es/review/x",
  title: "Reseña",
  images: [
    { format: "link" as const, url: "/api/share/image/review/r1?format=link" },
    { format: "story" as const, url: "/api/share/image/review/r1?format=story" },
  ],
  imageAlt: "Reseña",
  downloadName: "resena",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.payload.mockResolvedValue(payload);
});

describe("LazyShareSheet", () => {
  it("cerrada no pide nada", () => {
    renderWithIntl(<LazyShareSheet open={false} onClose={vi.fn()} kind="album" refId="rg1" />);
    expect(mocks.payload).not.toHaveBeenCalled();
  });

  it("abierta pide los datos y muestra la hoja", async () => {
    renderWithIntl(<LazyShareSheet open onClose={vi.fn()} kind="album" refId="rg1" />);
    expect(await screen.findByRole("button", { name: "Copiar enlace" })).toBeTruthy();
    expect(mocks.payload).toHaveBeenCalledWith("album", "rg1", "es");
  });

  it("si ya no se puede compartir lo dice", async () => {
    mocks.payload.mockRejectedValue(new Error("404"));
    renderWithIntl(<LazyShareSheet open onClose={vi.fn()} kind="list" refId="l1" />);
    expect((await screen.findByRole("alert")).textContent).toContain("ya no se puede compartir");
  });
});

describe("ShareOfferToast", () => {
  it("es un aviso, no un diálogo, y no pide datos hasta que se acepta", () => {
    renderWithIntl(<ShareOfferToast message="Tu reseña está publicada." kind="review" refId="r1" onDone={vi.fn()} />);
    expect(screen.getByRole("status").textContent).toContain("Tu reseña está publicada.");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.payload).not.toHaveBeenCalled();
  });

  it("se va solo", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    renderWithIntl(<ShareOfferToast message="Listo" kind="review" refId="r1" onDone={done} />);
    act(() => {
      vi.advanceTimersByTime(UNDO_TOAST_MS);
    });
    expect(done).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("abrir la hoja la reemplaza, y expirar ya no la cierra", async () => {
    const done = vi.fn();
    renderWithIntl(<ShareOfferToast message="Listo" kind="review" refId="r1" onDone={done} />);
    await userEvent.click(screen.getByRole("button", { name: "Compartir" }));
    expect(await screen.findByRole("button", { name: "Copiar enlace" })).toBeTruthy();
    expect(done).not.toHaveBeenCalled();
  });
});
