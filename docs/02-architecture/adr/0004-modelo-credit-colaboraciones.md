# ADR 0004 — Modelo CREDIT para colaboraciones, en vez de una FK directa artist_id

**Estado:** Aceptado

## Contexto

La industria musical tiene patrones de autoría que no se resuelven con una única columna `artist_id` en `release_group` o `recording`: features (billing menor), colaboraciones a la par (dúos), y álbumes de "Various Artists" donde el álbum no tiene un artista principal fijo pero cada canción adentro sí.

## Decisión

Introducir una tabla `CREDIT` como capa de indirección entre `ARTIST` y sus objetivos (`RELEASE_GROUP` o `RECORDING`), con posición, rol (`primary`/`featured`) y frase de unión (`feat.`, `&`, etc.), en vez de una FK directa.

## Justificación

- Un feat. se modela como dos filas de `CREDIT` con roles distintos; un dúo, como dos filas con rol igual; un compilado, como un crédito a "Various Artists" a nivel de álbum más créditos reales a nivel de cada canción. Un solo mecanismo cubre los tres casos.
- El perfil de un artista se arma con una consulta ("todo lo que tiene un `CREDIT` con este `artist_id`"), no con una restricción de esquema — esto es lo que permite mostrar en el mismo perfil la carrera de banda y la solista de un mismo artista (el caso de referencia usado durante el diseño fue Roger Waters / Pink Floyd) sin necesitar cambios futuros al esquema.

## Alternativas consideradas

- **FK directa `artist_id` en `release_group`/`recording`**: descartada — no puede representar más de un artista por objetivo sin duplicar filas o forzar columnas adicionales (`artist_id_2`, `artist_id_3`...) que no escalan.
- **Columna de texto libre con el nombre de los artistas**: descartada — pierde toda relación estructurada con el resto del modelo (perfiles, discografía, membresías).

## Consecuencias

Toda lectura de "artista principal" de un álbum o canción requiere ahora un `JOIN` contra `CREDIT` en vez de una columna directa. Se considera un costo aceptable frente a la flexibilidad que gana el modelo.
