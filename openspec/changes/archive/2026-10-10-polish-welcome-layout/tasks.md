## 1. Huecos verticales

- [x] 1.1 `SearchStatus` sin altura mínima (región `status` siempre montada)
- [x] 1.2 Los cuatro pickers renderizan la lista de resultados solo si hay resultados
- [x] 1.3 `AudienceNote`: «Cambiar» con zona táctil de 44 px sin engordar la línea
- [x] 1.4 Prueba: sin búsqueda ni elegidos no hay lista vacía

## 2. Resumen

- [x] 2.1 «Ir a Inicio» como única acción (ancho completo en móvil) y lista «También puedes» (`SummaryLink`, `summary.also` es/en)
- [x] 2.2 Prueba: un solo botón y el orden de los enlaces

## 3. Documentación y verificación

- [x] 3.1 `docs/05-features/onboarding.md`
- [x] 3.2 Capturas a 375 px sobre el servidor de desarrollo: huecos de 24–32 px, resumen con jerarquía; usuario de prueba borrado
- [x] 3.3 `pnpm run typecheck && pnpm run lint && pnpm run test` (sin `build`: hay un `next dev` ajeno corriendo sobre el mismo `.next` y un build lo corrompería)
