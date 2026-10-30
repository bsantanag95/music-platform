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
// Solo en entornos con DOM (jsdom); los tests con `@vitest-environment node`
// no tienen `Element` definido.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = function scrollIntoView() {};
}

// `withClientMessages` envuelve páginas y layouts en `ClientMessages`, un
// componente de servidor asíncrono que jsdom no puede renderizar. Las pruebas
// llaman a la ruta directamente y ya proveen los textos con `renderWithIntl`, así
// que aquí la ruta queda sin envolver (openspec: trim-client-messages). Las
// pruebas del propio módulo usan `vi.importActual`.
vi.mock("@/i18n/client-messages", () => ({
  withClientMessages: <Route,>(_scope: string, route: Route): Route => route,
  ClientMessages: ({ children }: { children: React.ReactNode }) => children,
}));
