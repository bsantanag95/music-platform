## Context

La cabecera del álbum es una cuadrícula con áreas (`cover`, `identity`, `facts`, `community`, `panel`) que cambia por
punto de corte. La del artista (pulida en `polish-artist-header` y `refine-artist-page-phase1`) usa una franja de
comunidad (`ArtistCommunity`) y un panel con filas `Field` (etiqueta + acción, valor debajo).

## Decisions

### D1. Comunidad: celdas según los datos

La franja tiene 2 o 3 celdas: Media (solo si `averageStars` no es nulo, es decir, desde 5 valoraciones), Valoraciones
(detalle "N reseñas" solo si hay alguna) y Lo coleccionan (detalle "N lo buscan" solo si no es 0 exacto). Las
columnas salen de la cantidad de celdas. Es la misma estructura `<dl>` que el artista, con cifra arriba. El resumen de
una línea para móvil desaparece: la franja cabe en 375 px.

### D2. Panel: dos conmutadores, no tres

La maqueta proponía una tercera casilla "+ Escucha". Registrar una escucha no es un conmutador (no tiene estado
encendido/apagado) y ya es la acción de la fila Escuchas; repetirla arriba duplicaría el control. Favorito y
Pendiente van arriba, en dos columnas y sin apilar (caben).

### D3. Filas `Field` en el panel del álbum

Se reusa el patrón del artista: etiqueta y acción arriba, valor debajo, atenuado cuando dice que no hay nada. Valores
nuevos: "Sin reseña", "Sin escuchas", "No está en tu colección". La colección con datos muestra "Lo tienes · Vinilo" y
"En tu búsqueda" como valor. Géneros no tiene valor (el panel de votos dice su estado al abrirse). Las acciones de
texto pasan a gris, como en el artista: el ámbar queda para los conmutadores activos y las estrellas.

### D4. Cabecera en móvil

Áreas en móvil: `'cover identity' 'facts facts' 'community community' 'panel panel'` con columnas `6rem | 1fr`. El
título baja a `text-2xl` en móvil para no partirse en tres líneas junto a la carátula. La ficha deja de usar
`<details>`: cuatro filas cortas no justifican plegarse, y el artista la muestra abierta.

### D5. `TitleTile` compartido

El relleno tipográfico pasa a `src/components/catalog/TitleTile.tsx` con `title`, `year` y `className`. La franja lo
usa cuando el disco no tiene `coverThumbUrl`.

## Risks / Trade-offs

- **Título repetido en la franja**: el cuadro tipográfico y el texto de debajo dicen el mismo título, igual que en la
  grilla del artista. El cuadro es decorativo (`aria-hidden`).
