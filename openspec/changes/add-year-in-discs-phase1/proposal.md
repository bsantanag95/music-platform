## Why

El primer pendiente de las Láminas es **Tu año en discos** (`docs/05-features/sharing.md` §4.4.1), con objetivo antes de diciembre. Es la respuesta de
la casa al resumen anual de los servicios de streaming, con el principio de `product_philosophy.md`: "Spotify *muestra* tu año; acá lo *construyes*".
La base ya existe: el diario guarda cada escucha con su contexto (primera escucha, reescucha, redescubrimiento) y la zona horaria de la persona. Esta es
la primera de tres fases.

## What Changes

- **Página derivada** `/users/<u>/year/<año>`: el año de una persona en discos, mes por mes, con las carátulas de los discos que escuchó cada mes (sin
  repetir dentro del mes), y cifras propias: escuchas, discos distintos, discos nuevos (primera escucha) y artistas descubiertos (su primera escucha en
  la vida de la cuenta cae en ese año). Sin texto de las escuchas, reacciones ni notas.
- **El año en curso existe siempre**, marcado "hasta ahora"; los años pasados quedan como archivo. Sin escuchas, no hay año.
- **Marca por año para compartirlo**, como la discografía: el dueño lo ve siempre; con la marca lo ve quien pueda ver su perfil. La marca no vuelve
  públicas las escuchas una por una, y el aviso dice antes qué se va a ver (también los discos de escuchas privadas). Es reversible.
- **Zona horaria fija al compartir:** la marca guarda la zona del dueño, así todos ven los mismos meses que él.
- **Compartir:** objetivo `year` con imagen en formatos Enlace e Historia, en el marco común (cifras y hasta 4 carátulas, las más escuchadas: el tope de lo que compone el sistema,
  ADR 0049), lo propio con imagen privada y gesto.
- **Entradas:** desde el diario y desde `/me/laminas` ("Tus años").
- Migración `0087` (`year_share`, `share_event` con `year`).

Fuera de esta fase: Top 5 del año y ocultar discos, imagen en Publicación e Historia con el calendario completo (Fase 2, con su decisión de carátulas);
invitación de diciembre y "Arma la tuya" (Fase 3).

## Capabilities

### New Capabilities

- `year-laminas`: página del año, cifras, visibilidad con la marca por año y su zona horaria.

### Modified Capabilities

- `share-events`: tipo `year`.
- `personal-share-image`: el año propio tiene imagen privada, gesto y dejar de compartir.

## Impact

- **Base de datos:** migración `0087` (`year_share`, `CHECK` de `share_event`).
- **Código:** `src/services/laminas/year.ts` nuevo, página `/users/[username]/year/[year]`, `src/services/share/` (objetivo `year`, lo propio), entradas
  en el diario y en `/me/laminas`.
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `domain-model.md`, `business-rules.md`, `03-data/sql-model.md`, `04-api/contracts.md`.
