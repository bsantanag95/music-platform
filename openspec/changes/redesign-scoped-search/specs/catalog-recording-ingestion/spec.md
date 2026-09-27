## MODIFIED Requirements

### Requirement: Salida a MusicBrainz solo por el cliente único con presupuesto acotado

La detección y apariciones de grabaciones SHALL realizarse exclusivamente a través de
`src/services/musicbrainz/client.ts` (cola de rate limit, `User-Agent` obligatorio, sin URLs de
MusicBrainz construidas en otro lugar), y SHALL ejecutarse únicamente en búsquedas del tipo
**Canciones** (las búsquedas de Artistas, Álbumes y Usuarios nunca resuelven grabaciones). El
presupuesto por búsqueda es: por cada interpretación probada (como máximo dos, ver "Detección
del artista en Canciones" en `search-query-matching`), una solicitud de browse de la discografía
del artista interpretado (solo si no hay créditos locales que la sirvan) y una solicitud de
búsqueda de recordings (texto libre o, con artista interpretado, cláusula `rgid:` sobre sus
álbumes propios); y, para unir las apariciones de los candidatos del primer grupo (canción,
artista), como máximo **cuatro** solicitudes de browse de releases (cada una, una página de 100 — los primeros
candidatos relevantes en orden de score, sin corte temprano: la unión de versiones es el
comportamiento esperado). Las lecturas de contexto de búsqueda SHALL compartir la caché TTL de
búsquedas del cliente; el browse de discografía sigue la política de las ingestas (fresco). La
ingesta de la grabación identidad SHALL ser una por búsqueda.

#### Scenario: Misma consulta repetida dentro de la TTL
- **WHEN** la misma búsqueda se repite dentro de la ventana de caché y la canción sigue sin
  existir localmente
- **THEN** la búsqueda y las apariciones se sirven desde la caché del cliente sin round-trips a
  MusicBrainz

#### Scenario: Unión del clúster de grabaciones duplicadas
- **WHEN** la búsqueda devuelve varias grabaciones para la misma canción y solo una tiene un
  número claramente mayor de apariciones
- **THEN** el sistema browséa los primeros 4 candidatos relevantes, UNE sus apariciones en el
  contexto, e ingiere únicamente la de mayor `release-count` (la identidad)

#### Scenario: Apariciones más allá de la primera página
- **WHEN** una canción tiene más de 100 releases en MusicBrainz
- **THEN** se listan los obtenidos en la primera página del browse y la sección se muestra sin
  paginación; no es la fuente de verdad de las apariciones de la canción

#### Scenario: Búsqueda de artistas sin resolución de canciones
- **WHEN** una persona busca `Sabrina Carpenter taste` con el tipo Artistas
- **THEN** no se emite ninguna solicitud de recordings ni de browse de apariciones, y no se
  ingiere ninguna grabación

#### Scenario: Segunda interpretación
- **WHEN** la primera interpretación de una búsqueda de Canciones no produce ninguna grabación
  relevante
- **THEN** se prueba la segunda (con su propio browse de discografía si hace falta y su búsqueda
  de recordings) y no se prueba ninguna más
