# ADR 0007 — next-intl para internacionalización, con `[locale]` en la URL

**Estado:** Aceptado

## Contexto

Hasta ahora el proyecto asumía español como único idioma, tanto en dominio y documentación
(`/docs` completo está en español) como en la UI planeada (`03-best-practices.md` proponía rutas
de página en español: `/buscar`, `/artista/[id]`). La Etapa 3.0 (fundaciones de frontend) estaba
completa, pero las Etapas 3.1–3.6 — las que efectivamente escriben componentes con texto visible
al usuario — estaban en 🔴, sin código escrito. Ese fue el único momento del proyecto donde
introducir i18n no implicaba reabrir trabajo ya hecho; con la Etapa 3.1 ya construida, la
integración pasó de "fundación" a "migración/retrofit" documentada en `i18n.md`.

Se decidió que el producto soporte español e inglés desde el lanzamiento, con una arquitectura
que permita agregar locales adicionales sin rediseño — no sin implementación completa de N
idiomas ahora, sino sin fricción estructural más adelante.

## Decisión

Usar `next-intl` como librería de i18n, con el locale codificado como segmento de ruta dinámico
(`src/app/[locale]/...`), detección automática vía middleware, y catálogos de mensajes en JSON
organizados por dominio (`common`, `catalog`, `errors`), separados por locale.

## Justificación

- **Compatibilidad nativa con Server Components.** El proyecto ya decidió
  (`01-frontend-architecture.md`) que las páginas principales usan Server Components con llamada
  directa a `src/services/catalog/*`, evitando el patrón "todo pasa por la API propia".
  `next-intl` es, a la fecha de esta decisión, la única librería de i18n para App Router con
  soporte real de traducción en Server Components sin forzar esas páginas a Client Components —
  alternativas como `react-i18next` están pensadas para árboles de cliente y romperían esa
  arquitectura ya confirmada.
- **El locale en la URL es coherente con el resto de decisiones del proyecto.** ADR 0001 ya
  elige PWA con instalabilidad y compartir contenido vía Web Share API — un usuario debe poder
  compartir el link a un álbum y que abra en su idioma sin depender de detección de header en
  cada visita. Codificar el locale en la ruta (`/en/album/[id]`) hace esto trivial; guardarlo
  solo en cookie/sesión no.
- **Extensibilidad real sin sobre-ingeniería.** Agregar un tercer locale es: un archivo
  `messages/{locale}/*.json` nuevo + una entrada en `routing.ts`. No requiere tocar componentes,
  no requiere una capa de abstracción propia — el catálogo de mensajes ya es la única fuente de
  verdad de texto traducible.
- **Separación de catálogos por dominio, no un solo archivo monolítico.** Sigue el mismo
  principio ya aplicado en `docs/` (subcarpetas numeradas por capa) y en `schemas.ts` (agrupado
  por contrato de API): `errors.json` se mantiene indexado por el mismo `ErrorCode` que exporta
  `src/lib/api/schemas.ts`, sin duplicar el catálogo de códigos — solo el texto varía por locale.
- **Slugs de ruta neutros (inglés), no traducidos por locale.** Mantener slugs traducidos
  (`/buscar` vs `/search`) obliga a un mapeo de rutas por idioma que crece con cada locale nuevo
  y con cada página nueva — complejidad que no aporta valor real para un catálogo musical, donde
  el slug no es contenido de marketing. Se prioriza consistencia de URL sobre localización
  cosmética de la ruta.

## Alternativas consideradas

- **`react-i18next` / `i18next`**: el estándar histórico de React, pero su integración con
  Server Components de App Router es débil — la mayoría de guías lo usan solo en el árbol de
  cliente, lo que hubiera forzado a convertir `search`, `artista/[id]` y `album/[id]` en Client
  Components, revirtiendo la decisión ya tomada en `01-frontend-architecture.md` de usar Server
  Components para el primer render.
- **Solución casera (Context + JSON planos, sin librería)**: descartada por el mismo criterio
  que descartó "SQL crudo sin ORM" en ADR 0005 — es viable pero renuncia a utilidades ya
  resueltas (formato de fecha/número/plural por locale, negociación de `Accept-Language`, tipado
  de claves de mensaje) que tocaría reimplementar y mantener a mano.
- **Cookie/sesión de idioma sin prefijo de URL**: descartada porque rompe la compartibilidad de
  links en un idioma específico (ver justificación arriba) y complica el server-side rendering:
  sin el locale resuelto en la URL, cada Server Component necesitaría leer cookies antes de
  poder renderizar, perdiendo parte del beneficio de cacheo/estático que ya se buscaba con el
  patrón Server Components.
- **Slugs de ruta traducidos por locale** (`/buscar` en `/es`, `/search` en `/en`): descartado
  por el costo de mantenimiento descrito arriba, sin beneficio claro para este dominio.

## Consecuencias

- Toda ruta de página queda anidada un nivel más adentro (`src/app/[locale]/...`), afectando
  `layout.tsx`, `providers.tsx`, `error.tsx`, `not-found.tsx` y el route group `(catalog)` — se
  ejecutó como una migración explícita sobre los archivos ya creados en Etapa 3.1, en vez de
  como fundación previa, dado que 3.1 ya estaba completa al momento de tomar esta decisión (ver
  `i18n.md` para el detalle de la migración).
- `conventions.md` se actualiza en el mismo cambio: rutas de página pasan de "propuestas en
  español" a "slugs neutros en inglés, contenido localizado", revirtiendo la propuesta original
  de `03-best-practices.md` — mismo tipo de corrección explícita que ADR 0006 aplicó al pasar de
  tRPC (documentado) a REST (real). `/buscar` (Etapa 3.1) se renombra a `/search`.
- Los datos del catálogo (nombre de artista, título de álbum/canción, biografía) que vienen de
  MusicBrainz **no se traducen** — i18n aplica solo al *chrome* de la UI. Se anota explícitamente
  en `01-domain/business-rules.md` / `05-features/catalog-browsing.md` para que no se lea como
  omisión.
- Cualquier componente nuevo de `components/catalog/` o `components/ui/` que muestre texto debe
  consumir mensajes vía `next-intl` desde el momento en que se escribe — no hay período de
  gracia con strings hardcodeados a "traducir después", que es justamente el costo que esta
  decisión busca evitar.
- Se revisará esta decisión solo si en el futuro `next-intl` deja de mantenerse activamente o
  aparece una limitación real de Server Components no resuelta — no se anticipa ese escenario al
  momento de esta decisión.
