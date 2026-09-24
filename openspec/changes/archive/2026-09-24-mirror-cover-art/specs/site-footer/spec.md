## MODIFIED Requirements

### Requirement: Bloque de atribución de fuentes de datos

El footer SHALL incluir un bloque de atribución, visualmente separado, que declare:
(1) que la metadata del catálogo proviene de MusicBrainz, mayormente bajo CC0 y en
parte bajo CC BY-NC-SA 3.0; (2) que las carátulas provienen del Cover Art Archive,
se muestran en baja resolución con fines de identificación y son propiedad de sus
titulares de derechos; (3) que el servicio de metadata lo opera la MetaBrainz
Foundation; (4) que music-platform no está afiliada ni respaldada por la MetaBrainz
Foundation; (5) que music-platform no reproduce ni aloja audio; y (6), cuando el
contacto de retiro de carátulas está configurado, cómo pedir el retiro de una
carátula, con un enlace `mailto:` a ese contacto cuya dirección es visible como texto.
Cada fuente nombrada SHALL enlazar a su sitio oficial. El contacto de retiro SHALL
provenir de `src/lib/site-links.ts`, que lo lee de la configuración
(`COVER_ART_TAKEDOWN_EMAIL`); si no está configurado, el punto (6) SHALL omitirse.

#### Scenario: Las tres fuentes están nombradas y enlazadas

- **WHEN** se renderiza el bloque de atribución
- **THEN** aparecen los nombres "MusicBrainz", "Cover Art Archive" y "MetaBrainz",
  cada uno dentro de un enlace a su sitio oficial

#### Scenario: Los enlaces externos se abren de forma segura

- **WHEN** se renderiza cualquier enlace externo del bloque de atribución
- **THEN** tiene `target="_blank"` y `rel` que incluye `noopener` y `noreferrer`, y
  un indicador accesible de que abre en una pestaña nueva

#### Scenario: Los nombres de las fuentes no se traducen

- **WHEN** se cambia el locale entre `es` y `en`
- **THEN** los nombres "MusicBrainz", "Cover Art Archive" y "MetaBrainz Foundation"
  permanecen idénticos y solo cambia el texto que los rodea

#### Scenario: Aclaración de no afiliación y de no reproducción

- **WHEN** se renderiza el bloque de atribución
- **THEN** incluye una frase de no afiliación con MetaBrainz Foundation y una frase
  de que la aplicación no reproduce ni aloja audio

#### Scenario: Contacto de retiro configurado

- **WHEN** `COVER_ART_TAKEDOWN_EMAIL` tiene valor y se renderiza el bloque de atribución
- **THEN** incluye una frase localizada para pedir el retiro de una carátula con un
  enlace `mailto:` cuyo texto visible es esa dirección

#### Scenario: Contacto de retiro sin configurar

- **WHEN** `COVER_ART_TAKEDOWN_EMAIL` no tiene valor
- **THEN** el bloque de atribución no muestra la frase de retiro ni un enlace vacío
