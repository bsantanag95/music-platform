## Why

En artistas con discografías largas (decenas de sencillos, recopilatorios o en vivo) encontrar un
lanzamiento concreto obliga a adivinar en qué sección está y recorrerla entera, aun con la tabla
ordenable por título. La página ya tiene todos los discos del artista en el navegador, así que un
buscador sobre la discografía resuelve el problema sin pedir nada nuevo al servidor y sin sumar una
pestaña "Todos los lanzamientos".

## What Changes

- Buscador en la barra de secciones de la pestaña Discografía, visible solo cuando la discografía
  tiene al menos 20 discos. En móvil, un botón con ícono que despliega el campo a todo el ancho.
- Mientras hay texto, el contenido de la sección se reemplaza por los resultados de **todas** las
  secciones, agrupados por sección en una tabla (con el menú "…", las marcas y las columnas de
  siempre). No es una pestaña ni una sección nueva: al borrar el texto (o con Esc) vuelve la
  sección activa tal como estaba.
- Las pastillas de sección muestran la cantidad de coincidencias de cada una, atenuadas si no hay
  ninguna, y llevan al grupo correspondiente dentro de los resultados.
- Coincidencia tolerante: sin distinguir mayúsculas ni acentos, apóstrofos rectos y tipográficos
  equivalentes, en cualquier parte del título; en Apariciones también por el artista principal; un
  año de cuatro cifras coincide con el año del disco.
- Sin resultados: aviso con un enlace para buscar ese texto en todo el catálogo (`/search`).
- Si la discografía del artista todavía se está completando (primera visita con más de 300
  discos), los resultados lo avisan.
- La búsqueda no va a la URL ni se recuerda; se anuncia la cantidad de resultados a lectores de
  pantalla.

## Goals

- Encontrar un disco del artista escribiendo parte del título, sin saber su sección.
- Mantener la estructura por secciones como la navegación principal de la discografía.

## Non-Goals

- Buscar canciones dentro de los discos ("¿en qué disco está X?"): requiere otra consulta al
  servidor.
- Buscar en el catálogo completo: ya lo cubre `/search` (solo se enlaza desde el aviso vacío).
- Una pestaña o sección "Todos los lanzamientos".
- Guardar la búsqueda en la URL o entre visitas.
- Filtros por tipo, año o marcas personales.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `artist-discography-view`: se agrega el requisito del buscador de la discografía (resultados de
  todas las secciones agrupados, coincidencias por sección en las pastillas, aviso de discografía
  incompleta y aviso vacío con enlace a la búsqueda del catálogo).

## Impact

- `src/components/artist/ArtistDiscography.tsx` (buscador, resultados agrupados; la tabla pasa a
  aceptar grupos) y un módulo puro de coincidencia junto a él.
- `src/app/[locale]/(catalog)/artist/[id]/(tabs)/page.tsx`: pasa si la discografía está completa
  (`discography_complete_at`).
- Mensajes `catalog.artist.discography.search.*` en `messages/es` y `messages/en`.
- `docs/05-features/catalog-browsing.md`.
- Sin API, sin migración, sin dependencias nuevas.
