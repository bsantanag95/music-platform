## 1. Componente compartido y endpoint

- [ ] 1.1 Mover `DiscographyItemMenu` a `src/components/catalog/AlbumQuickActions.tsx` y actualizar la discografía (design.md D1)
- [ ] 1.2 Servicio de marcas de un disco reutilizando las consultas de `getDiscographyMarks` con un solo id
- [ ] 1.3 `GET /api/me/release-groups/{id}/marks` con `withErrorHandling`, 401/400/404, `no-store`, esquema Zod y cliente en `src/lib/api` (design.md D2)
- [ ] 1.4 Marcas bajo demanda en el componente: carga al abrir, acciones deshabilitadas mientras llegan, error con "Reintentar", sin request sin sesión (design.md D1)
- [ ] 1.5 `extraActions` opcionales (design.md D3)
- [ ] 1.6 Tests: endpoint (200, 401, 400, 404), carga bajo demanda, reintento, sin sesión

## 2. Superficies

- [ ] 2.1 Búsqueda: botón "…" al final de cada fila de álbum, fuera del enlace, con `authenticated` desde la página (design.md D4)
- [ ] 2.2 Explorar: `AlbumCard` reemplaza su `RowMenu` por el menú nuevo con "Ver en listas", "Lo busco" y "Ya la tengo" como extras (design.md D3)
- [ ] 2.3 Lista ajena: menú en las tres vistas, solo en listas de álbumes y sin `manage`
- [ ] 2.4 Tira del álbum: menú en la esquina de la portada, salvo el disco actual
- [ ] 2.5 Un solo menú abierto por superficie
- [ ] 2.6 Tests por superficie (presencia, lista propia sin menú, disco actual sin menú, extras de Explorar)

## 3. Orden de la tabla

- [ ] 3.1 Encabezados Año, Media y Tú ordenables con `aria-sort`, sentido natural y alternancia, vacíos al final, vuelta al orden por defecto al cambiar de sección (design.md D5)
- [ ] 3.2 Tests de orden

## 4. Documentación y cierre

- [ ] 4.1 `docs/04-api/contracts.md` y `errors.md` (endpoint nuevo); `docs/05-features/catalog-browsing.md` y la documentación de listas y Explorar
- [ ] 4.2 Mensajes en es (voseo) y en; retirar claves sin uso del menú anterior de `AlbumCard`
- [ ] 4.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [ ] 4.4 Verificar en el navegador contra la BD de scratch las cuatro superficies y el orden, con y sin sesión, escritorio y móvil
