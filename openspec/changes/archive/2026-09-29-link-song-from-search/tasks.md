## 1. Enlace directo en el panel

- [x] 1.1 `SongGroupPanel.tsx`: renderizar en el encabezado un `Link` de `@/i18n/navigation` a `/song/${group.recordingId}` con texto "Ver canción" y `aria-label` que nombre la canción, solo cuando `group.recordingId !== null` (design D1, D3)
- [x] 1.2 Verificar que la lista de álbumes y los grupos no resueltos mantienen su comportamiento actual (D2)

## 2. Mensajes

- [x] 2.1 Nuevas claves en `messages/es/catalog.json` bajo `catalog.search.results.songContext` (texto visible y etiqueta accesible)
- [x] 2.2 Espejo en `messages/en/catalog.json`

## 3. Pruebas

- [x] 3.1 Extender `src/components/catalog/search-results/search-results.test.tsx` (describe "Canciones"): con `recordingId` el grupo resuelto enlaza a `/song/<id>`; sin `recordingId` no hay enlace
- [x] 3.2 Verificar que la fila "Otras canciones con ese título" sigue enlazando a su propia búsqueda

## 4. Documentación y verificación

- [x] 4.1 `docs/04-api/contracts.md`: actualizar la regla de navegación del tipo Canciones (el grupo resuelto enlaza a `/song/<id>` además de sus álbumes; `recordingId` ya existe en la respuesta)
- [x] 4.2 `docs/05-features/catalog-browsing.md`: reflejar el enlace directo en la sección de búsqueda
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm run build` y la suite de tests
