## Why

En Mis conciertos, con el país sin anotar los totales decían «0 países», la etiqueta «SEGUIDORES» se repetía en cada fila,
«Registrar concierto» quedaba lejos del título (en Colección, «Añadir copia» va junto a él), una fila sin lugar quedaba en el
puro nombre del artista y la introducción sonaba a advertencia.

## What Changes

- Totales sin las cifras en cero, debajo del título; «Registrar concierto» junto al título.
- Seguidores como ícono con su nombre al pasar el cursor; Privado conserva el texto.
- Una fila sin lugar ofrece «Sin lugar · Agregar lugar», que abre la edición.
- Introducción: «Los conciertos a los que fuiste, año por año.»

## Capabilities

### Modified Capabilities
- `concert-log`: presentación de la página Mis conciertos.

## Impact

`OwnConcerts.tsx`, `ConcertYearList.tsx`, `concert-ui.tsx`, la página `/me/concerts`, mensajes `concerts`, tests y
`docs/05-features/my-concerts.md`. Sin API ni esquema.
