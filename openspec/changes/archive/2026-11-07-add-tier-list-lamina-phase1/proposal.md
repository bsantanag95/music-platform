## Why

Top N y discografía ya están. La tier list es el último formato del bloque B (`docs/05-features/sharing.md` §4.3) y el más propio de la casa: no
se arma desde cero como en cualquier sitio, sino que nace de tus valoraciones. Eliges un artista, sus discos caen solos en su nivel según tu
nota y después los mueves a gusto. Esta es la primera de tres fases.

## What Changes

- **Tier list de álbumes** con seis niveles fijos, S, A, B, C, D y E, alineados con la escala de la casa (§5.3), con etiquetas editables, y una
  bandeja **"Sin escuchar / sin valorar"**.
- **Prellenada desde la discografía de un artista:** los discos principales caen en el nivel de tu nota y los que no valoraste, en la bandeja.
  Es una foto: después no cambia con tus notas.
- **La tier list no escribe valoraciones** (D8). Mover un disco de A a S no cambia tu nota.
- **Modelo:** `user_list` con `kind = 'tier'`, etiquetas de nivel en la lista y nivel en el ítem (`NULL` = bandeja), migración `0086`.
  Hereda audiencia, moderación, exportación y la exclusión de las superficies de listas, como el Top N.
- **Editor accesible en `/me/laminas/<id>`:** arrastrar y soltar del navegador en escritorio, y en cada disco un menú **"Mover a…"** (niveles,
  bandeja, izquierda y derecha) que funciona con teclado y toque. Sin dependencias nuevas.
- **Página pública** `/users/<u>/laminas/<id>` con los seis niveles. La bandeja se guarda, pero no sale ni en la página pública ni en la imagen.
- **Imagen:** Publicación (1080×1350), Enlace e Historia, con el color de la escala en cada nivel. Hasta 10 carátulas (ADR 0051), desde el nivel
  más alto; el resto, en texto.
- **Notas:** apagadas por defecto, como en el Top N. Encendidas, la página muestra la nota real de cada disco, discreta, como una insignia chica
  sobre su carátula.
- **Lo propio, compartir y feed:** igual que una Lámina Top N.

Fuera de esta fase: armar desde una lista, un género o una década, agregar discos a mano y tier lists de canciones (Fase 2); "Arma la tuya" desde la
tier list de otra persona y el llamado en la discografía (Fase 3); cantidad de niveles variable; "¿actualizar tu nota?".

## Capabilities

### New Capabilities

- `tier-laminas`: modelo, prellenado, editor, página pública, notas y reglas de una tier list.

### Modified Capabilities

- `share-images`: imagen de una tier list.
- `share-events`: tipo `tier`.
- `personal-share-image`: una tier list también tiene imagen privada y gesto de hacer pública.

## Impact

- **Base de datos:** migración `0086` (`kind`, etiquetas, nivel del ítem, `CHECK` de `share_event`).
- **Código:** `src/services/laminas/` (tier list y prellenado), `/api/me/laminas` (alta y niveles), páginas `/me/laminas`, `/me/laminas/[id]` y
  `/users/[username]/laminas/[id]`, `src/services/share/` (`TierFrame`, objetivo), feed y lo propio.
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `domain-model.md`, `business-rules.md`, `04-api/contracts.md`, `03-data/sql-model.md`.
