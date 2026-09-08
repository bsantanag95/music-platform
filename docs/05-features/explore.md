# Descubrimiento — `/explore`

Cambio: `add-album-discovery` (Fase 0 de `redefine-content-hierarchy`).

Superficie pública centrada en álbumes que responde *"¿qué obras debería conocer?"*,
separada del feed (*"¿qué hace mi red?"*). En Fase 1 solo álbumes; artistas / canciones /
listas son pestañas futuras.

## Secciones de la portada

Se componen en `src/services/discovery/discovery.ts` (`getExplorePage`), server-render,
sin tabla materializada. Cada sección se **omite** si no tiene contenido.

| Sección | Fuente | Notas |
|---|---|---|
| Colecciones destacadas | `user_list_featured` (listas de `@exploracion`, por `rank`) | ancla anti-arranque-en-frío |
| Novedades | `release_group` studio/single_ep por `first_release_year` desc | siempre hay |
| Explorar por década | `first_release_year` agrupado por década | chips → `/explore?decada=1990` |
| Explorar por género | top-N de `release_group_tag` | chips → `/explore?genero=rock` |
| Mejor valorados | `rating` agregado por álbum | ver umbrales abajo |
| Más reseñados | `review` contado por álbum | ver umbrales abajo |

### Umbrales de los rieles por reglas (`src/services/discovery/constants.ts`)

- **Elegibilidad del álbum** — `MIN_RATINGS_PER_ALBUM` (=3), `MIN_REVIEWS_PER_ALBUM` (=1):
  un álbum solo entra en el riel si supera ese conteo. Evita que un promedio alto con pocas
  señales domine.
- **Visibilidad del riel** — `MIN_ALBUMS_FOR_SECTION` (=6): el riel se muestra solo si hay
  esa cantidad de álbumes elegibles; debajo, se omite por completo.

Ajustar estos valores es editar la constante — no hay migración.

## Listados filtrados

`/explore?decada=<año>` o `/explore?genero=<tag>` (un corte a la vez; la década tiene
prioridad si llegan ambos). Grilla paginada con paginación server-side (anterior /
siguiente por `?page=`). No hay endpoint dedicado.

## Flag de lanzamiento

`EXPLORE_ENABLED` (server-side, `src/lib/config/discovery.ts`):

- `EXPLORE_ENABLED=1` fuerza encendido, `=0` fuerza apagado.
- Sin la variable: encendido fuera de producción, **apagado en producción**.
- Apagado: el enlace a `/explore` no aparece en Header/Footer y la ruta redirige a Inicio.

Encender en producción cuando el seed tenga contenido suficiente.

## Contenido semilla

```
ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-discovery.ts
```

Idempotente. Crea la cuenta `@exploracion` y sus colecciones destacadas. **Las colecciones
que define el script hoy son semilla derivada de datos** (novedades, un disco por década) —
garantizan que el riel editorial no esté vacío en cualquier BD poblada. Reemplazá
`COLLECTIONS` en `scripts/seed-discovery.ts` por picks curados de verdad (por `mbid`)
cuando tengas curaduría humana; el script salta los álbumes que no estén en el catálogo
local con un aviso.

Limpieza: `DELETE FROM app_user WHERE username = 'exploracion';` (cascade).

## No incluido en Fase 1

Feed de reseñas, personalización/afinidad, pestañas no-álbum, UI de administración de
curaduría, combinación de filtros, "seguir artista".
