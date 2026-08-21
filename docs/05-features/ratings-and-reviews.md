# Valoraciones y comentarios — el núcleo social base

**Fase:** 4 (roadmap). **Estado:** implementado y validado
(`01-domain/business-rules.md`, `03-data/sql-model.md`).

Este documento describe el comportamiento del feature base tal como quedó definido en la
Fase 0. `listening-diary-and-ratings.md` propone una capa adicional sobre esta base (el
historial de escuchas) — leer ese documento para la evolución del feature, no como
reemplazo de lo que sigue.

## Qué se puede valorar y comentar

Tres niveles, cada uno independiente: **artista**, **álbum** (concepto, no edición), y
**canción** (grabación única, sin importar en cuántos discos aparece). Un artista, álbum o
canción se comenta y valora exactamente igual, misma UI, mismo componente — no hay
tratamiento especial por nivel.

## Valoración dual

Dos escalas, siempre coherentes entre sí (forzado a nivel de base, no solo de interfaz):

- **Estrellas** (0.5 a 5, pasos de 0.5) — la acción rápida, el primer paso.
- **Valoración detallada** (1 a 100, opcional) — solo puede moverse dentro del rango de 10
  puntos que corresponde a las estrellas ya elegidas. Cambiar el rango requiere cambiar
  primero las estrellas.

**Edición:** una nueva valoración de un usuario sobre el mismo objetivo **reemplaza** a la
anterior — no hay historial en `rating` (eso es justamente lo que
`listening-diary-and-ratings.md` propone agregar por separado, sin tocar esta garantía).

## Comentarios

Texto libre, con un máximo implementado de 5000 caracteres y sin mínimo. A diferencia de la
valoración, un mismo usuario puede dejar **más de un** comentario sobre el mismo objetivo — no hay
reemplazo ni límite de cantidad.

Los comentarios publicados pueden editarse o borrarse únicamente por su autor. El borrado es
físico e irreversible, y las mutaciones requieren una sesión válida.

## Fuera de alcance pendiente

- ¿Moderación o reporte de comentarios? Fuera de alcance de este documento — ver
  `04-riesgos.md` si se agrega como riesgo al planificar Fase 4.

## Fuera de alcance de este documento

El diario de escucha (`listening-diary-and-ratings.md`) y el feed de actividad
(`activity-feed.md`) construyen sobre este núcleo pero no lo modifican.
