## Why

La pestaña Créditos muestra completos todos los niveles. En discos con muchos músicos
invitados y personal de producción (pop actual: decenas de personas) la pestaña se vuelve
una pared de filas, y las filas con muchos roles se estiran a todo el ancho. Además, la
lectura de roles tiene tres defectos visibles: el primer nivel se rotula "Integrantes de la
banda" aunque el artista principal sea una solista; el modificador `additional` de
MusicBrainz aparece como si fuera un instrumento ("adicional"); y varios atributos y tipos
llegan sin traducir ("membranophone", "arranger", "producción (coproducción)").

## What Changes

- El primer nivel se rotula **"Artista principal"** (o "Artistas principales") cuando todos
  los artistas principales del álbum son personas, e **"Integrantes de la banda"** en los
  demás casos. Siempre visible.
- **Músicos invitados** y **Producción y sonido** se muestran abiertos con hasta 6 personas;
  con más, contraídos por defecto con un resumen: cantidad y los tres primeros nombres
  ("23 · Brian Malouf, Jim McGorman, Sarah Carpenter y 20 más"), desplegables. **Arte y
  otros** sigue contraído siempre.
- Cada fila muestra hasta 4 roles y "+N" para desplegar el resto; las pistas van en su
  propia línea bajo los roles.
- Roles: los modificadores de instrumentos y voces (`additional`, `guest`) dejan de
  mostrarse como un rol propio; `solo` se muestra como matiz del instrumento
  ("guitarra (solo)"). Los modificadores de otros tipos usan una etiqueta compuesta cuando
  existe ("coproducción", "producción ejecutiva", "producción adicional"). Se agregan
  traducciones faltantes (membranófonos → "percusión", arreglos, pandereta, campana,
  etc.). Un valor sin traducción sigue mostrándose tal cual.

## Goals

- Que la pestaña quepa en una pantalla razonable en discos muy acreditados, sin ocultar
  nada en discos con pocos créditos.
- Rótulos correctos para solistas y roles legibles.

## Non-Goals

- Cambiar la ingesta, el modelo `personnel_credit` o la clasificación en niveles.
- Búsqueda o filtros dentro de la pestaña.
- Cambiar la pestaña Canciones o los créditos destacados de la cabecera.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `catalog-album`: la pestaña Créditos contrae los niveles largos, rotula el primer nivel
  según el tipo de artista principal y compacta las filas.
- `personnel-credits`: la lectura informa si el artista principal es persona o grupo, y los
  modificadores de rol no se presentan como roles.

## Impact

- `src/services/catalog/personnel-levels.ts` (`getAlbumPersonnel` devuelve también
  `leadKind`), `album-data.ts`, página `credits/page.tsx`.
- `src/components/album/AlbumCredits.tsx`, `credit-roles.ts` y sus tests.
- `messages/{es,en}/catalog.json` (`catalog.album.credits`).
- Sin cambios de esquema, API REST ni dependencias.
