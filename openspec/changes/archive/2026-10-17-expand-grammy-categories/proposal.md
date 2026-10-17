## Why

Premios cubre hoy los Grammy 2021–2025 con solo el campo general (Álbum, Grabación y Canción del año, Artista nuevo) y
nueve "Mejor álbum de …". Falta la ceremonia más reciente (2026, celebrada el 1 de febrero de 2026) y faltan las
categorías que más se comentan después de las grandes: Productor y Compositor del año, y las interpretaciones y
canciones por género (Mejor interpretación de rock o de metal, Mejor canción de rap, Mejor grabación dance/electrónica…).
Hoy una persona que busca "quién ganó Mejor interpretación de rock" no lo encuentra, y los perfiles de productores y
compositores no muestran sus premios aunque ya existen en la aplicación.

## What Changes

- **Ceremonia 2026** (68.ª edición) completa para todas las categorías cubiertas. Los Grammy pasan a cubrir 2021–2026.
- **Selección de categorías** (la lista exacta y sus criterios están en `design.md`): se agregan las categorías
  transversales a todos los géneros, las interpretaciones/canciones/grabaciones de los seis campos de música popular
  (pop, dance/electrónica, rock/metal/alternativa, R&B, rap, country) y se descartan las técnicas, de nicho, clásicas y
  de otros formatos (ingeniería, empaque, video musical, banda sonora de videojuegos, remezclas, comedia, etc.).
- **Productor del año (no clásico) y Compositor del año (no clásico)**: son categorías cuyo sujeto es un artista del
  catálogo, así que reutilizan el modelo existente (como "Mejor artista nuevo"): no requieren tablas ni sujeto nuevo.
  El nominado enlaza a su perfil. Compositor del año existe desde la ceremonia de 2023.
- **Tres niveles en la página de ceremonia**, en este orden: **Campo general** (las cuatro grandes más Productor y
  Compositor del año), **Por álbum** (los "Mejor álbum de …", hoy bajo "Mejor álbum por género") y **Por género**
  (interpretaciones, canciones y grabaciones, agrupadas por campo: Pop, Dance/Electrónica, Rock y alternativa, R&B, Rap,
  Country).
- **Categorías nuevas en 2026** que reemplazan a una anterior: "Mejor álbum de country" se divide en "Mejor álbum
  contemporáneo de country" y "Mejor álbum tradicional de country" (categorías distintas enlazadas a su predecesora),
  (el resto de la nómina de álbumes no cambia; ver preguntas abiertas en `design.md`).
- **Retroceso de años anteriores:** las categorías nuevas se cargan también para 2021–2025 en los años en que existieron
  (p. ej. "Mejor grabación dance pop", que solo existe desde 2025), cada una con su cobertura real: `complete` salvo que no se haya
  podido verificar contra la fuente.
- **El orden en las listas de ganadores** pasa a respetar el nivel (general, álbum, género). Hoy
  `sortCategoryEditions`, la colección `grammy-winners` y la lectura de "qué ganó este álbum" tratan "no general" como
  un solo bloque; con tres niveles hay que distinguirlos.
- **Guardas en el cargador:** una categoría `complete` con menos de 3 nominados falla la validación (hoy nada impide
  marcar `complete` una categoría con un solo nominado cargado por error).

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `music-awards`: el nivel de categoría pasa de dos valores (`general`, `genre`) a tres (`general`, `album`, `genre`);
  las categorías de nivel `genre` declaran un campo (Pop, Rock…); aparece el requisito de categorías de persona
  (Productor y Compositor del año, sujeto artista); la página de ceremonia agrupa por nivel y, en el nivel de género,
  por campo; la validación exige al menos 3 nominados en una categoría `complete`.
- `explore-day-zero-templates`: la colección "Ganadores del Grammy {año}" ordena sus ganadores por nivel
  (general, álbum, género) en vez de "general primero, el resto por clave".

## Impact

- **Datos:** `data/awards/grammy/categories.json` (22 categorías nuevas; las 9 existentes pasan al nivel `album`) y
  `data/awards/grammy/ceremonies/2021–2026.json` (unas 600 nominaciones nuevas más las ≈ 80 de las categorías ya existentes en la ceremonia 2026).
- **Esquema:** migración `0072` (ensancha el `CHECK` del nivel, mueve las filas existentes de `genre` a `album`, agrega
  `award_category.field` obligatorio para el nivel `genre`); espejo en `src/db/schema.ts` y `docs/03-data/sql-model.md`.
- **Código:** `src/services/awards/` (esquema de curaduría, carga, lectura, contexto de colección), plantilla
  `grammy-winners`, página de ceremonia y `AwardCategory`, mensajes es/en.
- **Documentación:** `docs/05-features/awards.md`, `docs/01-domain/business-rules.md` / `domain-model.md` (reglas del
  nivel de categoría), nuevo ADR (sujeto persona y niveles), `docs/03-data/sql-model.md`.
- **Sin dependencias nuevas, sin cambios de contratos de API.** La resolución de MBID reutiliza el cliente de
  MusicBrainz existente; las categorías de persona resuelven artistas por nombre exacto.

## Goals

- Cubrir la ceremonia 2026 y las categorías seleccionadas en las seis ceremonias, enlazadas al catálogo.
- Que Productor y Compositor del año lleven al perfil del nominado.
- Que la página de ceremonia se lea en tres niveles claros sin volverse una lista interminable.

## Non-Goals

- Cubrir todas las categorías del Grammy (la selección descarta a propósito las técnicas y de nicho).
- La insignia de ganador en fichas de álbum, canción y artista, y los ganadores históricos desde 1959: siguen
  pendientes, como se acordó en `add-music-awards`.
- Otros premios (Grammy Latino, Mercury…) o ceremonias anteriores a 2021.
- Cambiar el modelo de datos de la nominación o el flujo de curaduría/resolución.
