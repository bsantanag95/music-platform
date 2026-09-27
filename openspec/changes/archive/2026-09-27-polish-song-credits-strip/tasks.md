## 1. Tira de pistas y antetítulo

- [x] 1.1 Antetítulo siempre "Canción"; quitar el mensaje `kickerTrack`; tests
- [x] 1.2 Tira: etiquetas "Anterior"/"Siguiente", número separado del título ("2 · Tears"), área de clic completa, "Inicio del disco"/"Fin del disco" en los extremos, centro "*Disco* · N de M"; mensajes; tests

## 2. Créditos de la grabación

- [x] 2.1 Bloque a ancho completo cuando Composición no se muestra
- [x] 2.2 Una persona por fila (nombre | roles) por grupo, reutilizando el formateador de roles del álbum; "+N" con más de 5 roles; tests
- [x] 2.3 Intérpretes: integrantes primero, destacados y separados de los invitados; tests
- [x] 2.4 Sonido ordenado por rol principal y asistentes al final contraídos en "+N asistentes"; tests

## 3. Cierre

- [x] 3.1 Actualizar `docs/05-features/catalog-browsing.md` (sección 3b)
- [x] 3.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.3 Verificar en el navegador con "Manchild" y "November Rain"
