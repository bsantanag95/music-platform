// Navegación completa del navegador (no del router de Next). Tras iniciar sesión o registrarse el
// layout —Header con la sesión— tiene que volver a renderizarse en el servidor; con `router.push`
// el layout compartido no se vuelve a pedir y hacía falta un `router.refresh()` aparte, que pedía
// la página destino dos veces (la primera, abortada). Aislada en un módulo para poder simularla
// en las pruebas (jsdom no implementa `location.assign`).
export function hardNavigate(url: string): void {
  window.location.assign(url);
}
