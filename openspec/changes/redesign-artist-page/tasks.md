## 1. Rutas y carga de datos

- [ ] 1.1 Mover la página a `artist/[id]/(tabs)/`: `layout.tsx` (breadcrumb, aviso de origen de búsqueda, cabecera, pestañas, integrantes, notas), `page.tsx` (Discografía), `biography/page.tsx`, `loading.tsx` y `error.tsx` (design.md D1)
- [ ] 1.2 `artist-data.ts` con cargadores `React.cache` compartidos por layout, páginas y `generateMetadata` (artista, perfil, discografía, comunidad, estado personal)
- [ ] 1.3 Pestañas enlazables con `useSelectedLayoutSegment`; Biografía oculta y 404 sin resumen
- [ ] 1.4 Tests de rutas: pestaña por defecto, 404 de Biografía, metadata

## 2. Cabecera

- [ ] 2.1 Reescribir `ArtistHeader`: foto 4:3 (200 px escritorio, 96 px móvil) con crédito enlazado o placeholder 4:3; antetítulo de tipo, nombre y descripción
- [ ] 2.2 Ficha por tipo (grupo: Origen, Actividad y estado; persona: Nacimiento, Fallecimiento, Actividad desde el primer disco) y Enlaces en orden fijo (design.md D9)
- [ ] 2.3 Resumen recortado a tres líneas con "Seguir leyendo", atribución y aviso de idioma
- [ ] 2.4 Tests: cada escenario de `artist-header` y `catalog-artist` "Datos opcionales del artista"

## 3. Panel "Tu relación"

- [ ] 3.1 Servicio de estado personal del artista: seguir, favorito, Pendiente, escuchas derivadas (discos distintos y última escucha, incluidas las del artista), colección y búsqueda derivadas, listas propias, recorrido
- [ ] 3.2 Generalizar `AlbumListPicker` a un objetivo `{ type, id }` sin cambiar su comportamiento en el álbum
- [ ] 3.3 Componente del panel con las siete filas, estados anónimo / sin interacción / con interacción, conmutadores con `aria-pressed`, registro de escucha del artista y fila Recorrido con barra discreta o "Armar recorrido"
- [ ] 3.4 Quitar los botones sueltos y `ArtistJourneySection` de la página
- [ ] 3.5 Tests: cada escenario de `artist-personal-panel`, en particular que Escuchas nunca muestre el total de la discografía

## 4. Bloque de comunidad

- [ ] 4.1 `getArtistCommunityStats`: oyentes, seguidores, favoritos y listas, personas distintas de cuentas activas, con `thresholdCount` (design.md D6)
- [ ] 4.2 Componente de tres tarjetas reutilizando las piezas del álbum ("<5", texto para lectores de pantalla, enlace a listas)
- [ ] 4.3 Tests: umbrales, anonimato, sin promedio de estrellas ni agregado de recorridos

## 5. Discografía

- [ ] 5.1 `getArtistDiscography`: discografía propia con rol, sin marcados, secciones con cantidad y orden por año (design.md D2); sin mezclar la de los grupos
- [ ] 5.2 Medias de la comunidad y marcas personales por disco en dos consultas agrupadas (design.md D3)
- [ ] 5.3 Selector de secciones con cantidades, sección por defecto y parámetro `section` en la URL
- [ ] 5.4 Vista grilla (etiqueta EP, "Mejor valorado", marcas personales, "Mostrar más" de a 48) y vista tabla (año, miniatura, título, tipo traducido, comunidad con umbral, "Tú", artista principal en Apariciones, versión móvil)
- [ ] 5.5 Selector de vista con preferencia por sección en `localStorage` protegida con `try/catch` (design.md D4)
- [ ] 5.6 Franja "También en" para personas, sin ingerir la discografía de los grupos (design.md D8)
- [ ] 5.7 `LazyCoverImage` con `IntersectionObserver` (margen de 200 px) antes de pedir `/cover` (design.md D5)
- [ ] 5.8 Tests: cada escenario de `artist-discography-view` y "Carátula fuera de pantalla"

## 6. Biografía, integrantes y notas

- [ ] 6.1 Pestaña Biografía: introducción completa en párrafos, enlace al artículo, atribución y aviso de idioma
- [ ] 6.2 `ArtistMemberships` sin cambios después de las pestañas; notas de la comunidad al final
- [ ] 6.3 Tests de `artist-biography` y de `artist-page-layout` (orden de zonas)

## 7. Mensajes y documentación

- [ ] 7.1 Mensajes `catalog.artist` en es y en (secciones, tipos de MusicBrainz, ficha, panel, comunidad, biografía, atribuciones)
- [ ] 7.2 Actualizar `docs/05-features` (página de artista) y `business-rules.md` por el conteo de seguidores con umbral

## 8. Verificación

- [ ] 8.1 Revisión en el navegador con datos reales en la BD de scratch: Pink Floyd (muchas secciones), Los Bunkers (pocas), Kuervos del Sur (sin artículo en inglés), una solista con banda ("También en"), en escritorio y móvil, sesión anónima y autenticada
- [ ] 8.2 Comprobar en la pestaña de red que las carátulas sin resolver se piden al desplazarse
- [ ] 8.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
