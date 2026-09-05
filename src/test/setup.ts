import "@testing-library/jest-dom/vitest";

// jsdom no implementa IntersectionObserver (usado por los carruseles de
// Inicio y por ScrollablePreviewList para la carga incremental). Stub no-op
// global; los tests que necesitan disparar la intersección lo reemplazan
// puntualmente con su propio mock.
class NoopIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = NoopIntersectionObserver as unknown as typeof IntersectionObserver;
}

// jsdom no implementa `scrollIntoView` (usado por `ProsePanel` para corregir
// la posición del scroll al colapsar una cita larga). Stub no-op global,
// mismo criterio que IntersectionObserver arriba.
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}
