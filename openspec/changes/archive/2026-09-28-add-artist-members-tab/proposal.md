## Why

La página de artista muestra hoy a los integrantes como una lista simple debajo de las
pestañas, con un rol en inglés crudo y un solo período por persona, y a los grupos de una
persona como una franja "También en" dentro de su discografía. En Metal-Archives la
alineación es una de las partes más navegadas de una banda: separa la alineación actual, los
antiguos y los músicos en vivo, y cada integrante lleva sus otras bandas enlazadas, lo que
invita a seguir explorando. `add-artist-lineup-data` deja los datos listos (períodos,
instrumentos, fundadores, músicos de apoyo, otras afiliaciones); este cambio los presenta.

## What Changes

- **Pestaña Integrantes** en la página de un grupo, entre Discografía y Biografía, con URL
  propia y sub-vistas en la URL: Completa (por defecto, agrupada en Actual o Última
  alineación, Antiguos, Apoyo actual y Apoyo anterior), Actual, Antiguos y Apoyo. Las
  sub-vistas vacías se ocultan; la pestaña no aparece si el grupo no tiene integrantes ni
  apoyo.
- **Filas al estilo de Metal-Archives**: nombre enlazado, marca de fundador, año de muerte,
  instrumentos traducidos agrupados por períodos (años), "adicional" y "período
  desconocido".
- **"También en"** por integrante: sus otras bandas enlazadas (actuales, "ex-" y de apoyo),
  colapsado a **una sola línea** con hasta 3 bandas y "+N" que expande solo esa fila, para que
  quien tiene muchas no ocupe más espacio que quien tiene pocas. Aviso discreto mientras se
  sincronizan los integrantes.
- **Pestaña Bandas** en la página de una persona: sus grupos (con foto, período, instrumentos y
  discos principales), los artistas a los que da apoyo y, si es solista, sus propios músicos de
  apoyo. Reemplaza la franja "También en" de su discografía.
- **Línea en la ficha de la cabecera**: "Integrantes" (o "Última alineación") con hasta 5
  nombres enlazados y "Ver alineación"; en una persona, "Bandas" con sus grupos y "Ver todas".
- Se elimina la lista de integrantes o grupos debajo de las pestañas.

## Capabilities

### New Capabilities

- `artist-lineup-view`: pestañas Integrantes y Bandas, sub-vistas, formato de filas, "También
  en" colapsado y aviso de sincronización.

### Modified Capabilities

- `artist-page-layout`: pestaña nueva entre Discografía y Biografía; la sección de integrantes
  deja de estar debajo de las pestañas.
- `artist-header`: la ficha suma la fila Integrantes (grupos) o Bandas (personas).
- `artist-discography-view`: la franja "También en" pasa a la pestaña Bandas.
- `catalog-artist`: los integrantes y grupos se presentan en su pestaña.

## Impact

- **Rutas**: `src/app/[locale]/(catalog)/artist/[id]/(tabs)/members/page.tsx`; `layout.tsx`
  deja de renderizar `ArtistMemberships` y lee la línea de la cabecera.
- **Componentes**: `ArtistTabs` (pestaña nueva), `ArtistFacts` (fila nueva), componentes nuevos
  de la alineación en `src/components/artist/`; se eliminan `ArtistMemberships` y `AlsoIn`
  con sus tests.
- **Servicios**: usa `getArtistLineup` y `scheduleLineupMembersSync` de
  `add-artist-lineup-data`; `artist-also-in.ts` se retira.
- **Mensajes**: `catalog.artist.lineup.*` en es y en; los instrumentos reutilizan
  `catalog.album.credits.attributes`.
- **Docs**: `docs/05-features/catalog-browsing.md`.
- Depende de `add-artist-lineup-data` (se implementa después).
