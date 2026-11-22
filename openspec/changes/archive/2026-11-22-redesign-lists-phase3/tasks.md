## 1. Exhibidor de Destacadas

- [x] 1.1 `FeaturedExhibit` (servidor): fundas en abanico (círculo para artistas, silueta sin carátulas), insignia y tipo, título, descripción, primeros 4 elementos (3 en el teléfono), Abrir, Guardar y conteos
- [x] 1.2 Variante `compact` para la segunda destacada en adelante, en una fila de hasta 3
- [x] 1.3 `page.tsx`: elementos de la primera destacada con `getUserListDetail`, con `catch` a `null`; la página deja de usar `previewNames` (el campo se conserva: `CommunityListCard` lo sigue leyendo en su variante grande)
- [x] 1.4 Tests: exhibidor con y sin elementos, compactos, enlaces

## 2. Banda y estados

- [x] 2.1 `ListsSignUpBand` final: pila de tres fundas de la página, superficie y borde de la página, acciones
- [x] 2.2 Vacío global con la composición de la banda y su acción según la sesión
- [x] 2.3 Sin resultados en el modo explorar: título, frase, «Limpiar filtros» y «Buscar en todos los tipos» si hay tipo
- [x] 2.4 Tests de la banda y los estados

## 3. Mensajes, documentación y verificación

- [x] 3.1 Mensajes es/en y `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/lists-and-favorites.md`: exhibidor, banda, estados; plan de tres fases completo
- [x] 3.3 `pnpm run verify` y `pnpm run build`
- [x] 3.4 Verificación en el navegador a 1440, 1024, 820 y 390 px: exhibidor sin desbordes, banda, modo explorar sin resultados
