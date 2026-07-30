# Catálogo navegable — buscar → artista → álbum

**Fase:** 3 (roadmap). **Estado:** especificado, backend completo y validado — ver
`02-architecture/frontend-plan/` para la implementación de frontend en curso.

Este documento describe el comportamiento del feature desde la perspectiva del producto:
qué ve y qué puede hacer un usuario, en qué estados, y qué casos límite existen. El
contrato técnico exacto vive en `04-api/contracts.md`; las reglas de negocio subyacentes
(identidad de artista, remaster vs. versión nueva, ediciones) en `01-domain/business-rules.md`.

## Alcance de la Fase 3

Solo lectura, sin cuenta de usuario. El flujo completo:

```
Buscar artista → Perfil de artista → Álbum (tracklist + créditos)
```

La vista de detalle de canción queda deliberadamente fuera de esta fase (Camino A,
`02-implementation-plan.md`, Etapa 3.5) — se construye en Fase 4 junto al formulario de
valoración, para no reescribir la misma pantalla dos veces.

## 1. Buscar artista

El usuario escribe un nombre y el sistema busca (o ingiere bajo demanda) ese artista.

**Estados:**
- **Encontrado, ya cacheado** — respuesta casi instantánea.
- **Encontrado, primera vez** — dispara ingesta completa contra MusicBrainz; puede tardar
  varios segundos (rate limit de 1 req/seg). El usuario debe ver un estado de carga
  explícito, nunca un spinner genérico sin contexto — mensaje sugerido: *"Estamos
  importando este artista por primera vez..."*.
- **No encontrado** — MusicBrainz no tiene ningún resultado para ese nombre. Estado vacío,
  no un error.
- **Error** — fallo de red/servicio (`INTERNAL_ERROR`). Distinto de "no encontrado": acá
  sí es apropiado ofrecer reintentar.

## 2. Perfil de artista

Foto, nombre, biografía breve (si existe), y discografía agrupada en cuatro categorías
fijas: **De estudio**, **Singles/EP**, **Compilados**, **En vivo / Misceláneos** — el
diseño ya definido en la visión de producto.

**Caso Roger Waters / Pink Floyd (referencia del proyecto):** el perfil de un artista
muestra tanto su discografía como banda como su carrera solista en la misma pantalla, sin
distinguir "modo banda" de "modo solista" — es una sola discografía agrupada por
categoría, el hecho de que algunos álbumes sean con una banda y otros en solitario no
cambia la estructura de la pantalla. Ver ADR 0004 (modelo `CREDIT`) para el porqué.

**Artista sin discografía todavía cacheada:** primera visita a un artista recién
encontrado por búsqueda — la discografía se ingiere en el mismo request que resuelve el
artista (`findOrIngestDiscography`), así que al llegar a esta pantalla ya debería estar
completa. No hay un estado intermedio de "discografía cargando" distinto del estado de
carga de la búsqueda.

**Carátulas:** carga progresiva (lazy) — la grilla de álbumes se renderiza de inmediato
sin carátula, y cada álbum completa la suya en segundo plano apenas es visible. Decisión
ya tomada (Opción C, `00-backend-analysis.md`); nunca bloquear el render inicial de la
página esperando carátulas.

## 3. Detalle de álbum

Tracklist completo de la edición "oficial" (o la primera disponible), con posición,
título, duración (`mm:ss`), carátula, y créditos por canción.

**Créditos (`feat.`):** cada canción con colaboración muestra el crédito reconstruido
(ej. "Pink Floyd feat. Roger Waters"), enlazado al perfil del artista credited. Un track
sin créditos adicionales (el caso normal) no muestra nada extra — el crédito solo aparece
cuando aporta información sobre-y-encima del artista principal del álbum.

**Álbum sin ediciones ingeribles:** MusicBrainz no tiene ninguna `release` utilizable para
ese `release_group`. Estado vacío claro, no una pantalla en blanco ni un error genérico
(`NO_EDITIONS_FOUND`).

**Ediciones alternativas (japonesa, remaster, deluxe):** fuera de alcance de la Fase 3 —
se ingiere y muestra una sola edición por álbum (simplificación documentada en
`ingest-release.ts` y `sql-model.md`). El selector de edición es una función futura, no
decidida todavía.

## Casos límite conocidos (heredados del modelo de datos)

- **Re-grabación, remix o versión en vivo** de una canción aparecen como una entrada
  separada en el tracklist de su propio álbum — nunca se fusionan con la canción original,
  ni siquiera visualmente (son `RECORDING` distintos por diseño, ver `business-rules.md`).
- **Remaster de audio** de una canción existente **no** genera una entrada nueva en
  ningún listado — es la misma canción, mismo `RECORDING`, sin importar la edición.
- **Artista credited aún no visitado** (`type = 'unknown'`): si un usuario llega al perfil
  de un artista que solo existía como stub de un crédito ajeno, se enriquece automáticamente
  antes de responder — nunca debería verse un perfil con datos "a medias" en pantalla.

## Fuera de alcance de este documento

Valoración, comentarios, listas, favoritos y actividad social — ver
`ratings-and-reviews.md`, `lists-and-favorites.md` y `activity-feed.md` (Fases 4-5).
