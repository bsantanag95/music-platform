## Context

`SignedInHero` pinta el fondo con un `<div>` decorativo: `background-image: url(/hero/wall.webp)` (el mosaico curado de 8 × 4
carátulas de la portada, ver `src/lib/config/hero-covers.ts`), `bg-cover`, opacidad 12 % y una máscara
`linear-gradient(90deg, transparent 35%, #000 95%)`. Debajo de la cabecera, `RecentListensShelf` muestra las últimas escuchas
distintas (`listMyRecentListens`). Decisión del usuario (2026-11-18): fondo con **favoritos de álbum primero, completados con los
álbumes más escuchados y, si faltan, el mosaico general**.

## Goals / Non-Goals

**Goals:**
- Que el fondo de la cabecera muestre los discos de la persona cuando tiene suficientes, sin repetir el estante de debajo.
- Que el titular y el campo de registro sigan legibles en 1440, 1024, 820 y 390 px.
- Cero costo extra para quien no llega al mínimo.

**Non-Goals:**
- La portada sin sesión, su `HeroCrate` y el mosaico curado: no cambian.
- Animación del fondo (el de la portada se desliza; este sigue quieto).
- Elegir a mano los discos del fondo (sería una preferencia de perfil; fuera de alcance).

## Decisions

### Datos: `listMyBackdropAlbums(userId, limit = 20)`
Dos lecturas en `src/services/home/home.ts`, ambas del propio usuario y sin filtro de audiencia (es contenido propio, solo lo ve la
persona, como el estante):

1. Favoritos con `release_group_id` no nulo y `cover_thumb_url` no nula, por `created_at` desc, hasta `limit`.
2. Si no alcanza, álbumes de las escuchas agrupados por `release_group_id` con carátula, ordenados por `count(*)` desc y luego por la
   escucha más reciente, excluyendo los ya elegidos, hasta completar `limit`. Las escuchas de canción no cuentan (su carátula es la de
   un álbum elegido por aproximación; el fondo debe ser de álbumes reales de la persona).

Devuelve `{ id, coverThumbUrl }[]` sin duplicados. Se pide en el `Promise.all` de `AuthenticatedHome`; si devuelve menos de
`BACKDROP_MIN = 6`, la cabecera usa el fondo actual. *Alternativa descartada:* escuchas recientes (duplican el estante).
*Alternativa descartada:* una sola consulta con `UNION`; dos lecturas acotadas son más simples de probar y el segundo paso se omite
cuando los favoritos bastan.

### Presentación: `HeroBackdrop`
Componente de servidor decorativo (`aria-hidden`, `pointer-events-none`) que reemplaza el `<div>` del fondo. Con menos de
`BACKDROP_MIN` carátulas renderiza exactamente el fondo actual (una imagen). Con más, una rejilla de 8 × 4 celdas cuadradas con la
misma geometría que `HERO_WALL`, alineada a la derecha, la misma opacidad y la misma máscara:

- Las carátulas personales ocupan primero las celdas que la máscara deja ver (de la columna 7 hacia la izquierda, fila por fila,
  hasta 20 celdas: columnas 3–7); el resto de las celdas visibles y todas las ocultas por la máscara usan recortes del mosaico
  general (`background-image: wall.webp` + `heroWallTilePosition`, un solo archivo ya en caché).
- Las personales se cargan con `AppImage` (`sizes="250px"`, sin `priority`, `loading="lazy"`), así no compiten con el titular ni con
  la carátula de «Última vez», que sí es prioritaria.
- Por debajo de `lg`, la máscara pasa a `transparent 55%` y la opacidad a ~9 %: en una sola columna el titular cae sobre la mitad
  derecha del fondo.

*Alternativa descartada:* componer un mosaico por usuario en el servidor (como `scripts/build-hero-wall.ts`): necesita
almacenamiento y caché por persona para ahorrar unas pocas peticiones de miniaturas ya cacheadas.

## Risks / Trade-offs

- [Hasta 20 peticiones de imagen más por carga de Inicio] → Carga diferida y sin prioridad; miniaturas de 250 px ya servidas por el
  espejo con caché larga; nada extra por debajo del mínimo.
- [Una carátula muy clara puede restar contraste al titular] → Opacidad baja, máscara más agresiva por debajo de `lg` y verificación
  en los cuatro anchos con la cuenta real.
- [Un favorito o una escucha privada aparece en el fondo] → Solo lo ve la propia persona, igual que en el estante y en sus listas.

## Migration Plan

Sin migraciones ni cambios de API. Revertir el commit basta.

## Open Questions

_Ninguna._
