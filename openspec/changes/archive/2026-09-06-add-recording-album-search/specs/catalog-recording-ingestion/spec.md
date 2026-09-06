# catalog-recording-ingestion

Ingesta bajo demanda de una grabación suelta (`recording`) descubierta desde la búsqueda: lo
mínimo necesario para responder "¿en qué álbumes aparece esta canción?", sin tocar el tracklist
de ningún álbum.

## ADDED Requirements

### Requirement: Ingesta mínima e idempotente de una grabación suelta

El servicio `findOrIngestRecording` SHALL crear o recuperar una `recording` por su `mbid` de forma
idempotente (`INSERT ... ON CONFLICT DO NOTHING` + re-read), persistiendo título y duración
cuando la respuesta de MusicBrainz los traiga, y SHALL ingerir sus créditos de artista mediante
el mecanismo existente (`ingestCredits`, ADR 0004), creando los stubs de artista que falten. Cada
`release_group` de las apariciones SHALL persistirse como stub (mbid, título, categoría derivada
de `primary-type`/`secondary-types`) sin sobrescribir filas existentes.

#### Scenario: Grabación nueva
- **WHEN** la búsqueda resuelve una canción cuyo `mbid` no existe en la base local
- **THEN** se crean la fila `recording`, sus filas `credit` y los stubs de `release_group` de sus
  apariciones, y la respuesta referencia esas filas por su `id` local

#### Scenario: Grabación ya conocida
- **WHEN** la canción ya existe localmente por `mbid`
- **THEN** no se duplica ni se sobrescribe su contenido enriquecido, y se reutiliza la fila
  existente

### Requirement: Prohibición de ingestas parciales de releases y tracks

La ingesta de una grabación suelta SHALL NOT escribir filas en `release` ni en `track`. El
listado de apariciones que consume la búsqueda se calcula en vivo desde MusicBrainz (browse de
releases con sus release-groups, cacheado con la TTL de búsquedas). Fundamento: el read-model de
álbum devuelve el release local existente tal cual sin re-consultar MusicBrainz, por lo que un
tracklist parcial cacheado congelaría el álbum con datos incompletos.

#### Scenario: Álbum encontrado por canción aún sin abrir
- **WHEN** la búsqueda lista un álbum como aparición de una canción y ese álbum no tiene release
  local
- **THEN** no se crea ningún `release` ni `track`; el álbum queda como stub y su tracklist se
  ingiere normalmente la primera vez que alguien lo abre

#### Scenario: Álbum ya visitado
- **WHEN** una aparición de la canción corresponde a un `release_group` cuyo tracklist ya fue
  ingerido y contiene la grabación
- **THEN** la fuente local de la resolución aporta ese álbum a la unión (cubre apariciones que
  la página de 100 de MusicBrainz pudo truncar)

### Requirement: Salida a MusicBrainz solo por el cliente único con presupuesto acotado

La detección y apariciones de grabaciones SHALL realizarse exclusivamente a través de
`src/services/musicbrainz/client.ts` (cola de rate limit, `User-Agent` obligatorio, sin URLs de
MusicBrainz construidas en otro lugar), con un presupuesto por búsqueda de: una solicitud de
browse de la discografía del artista hint (solo si no hay créditos locales que la sirvan), una
solicitud de búsqueda de recordings (texto libre o, con hint de artista, cláusula `rgid:` sobre
sus álbumes propios) y, para unir las apariciones de los candidatos detectados, como máximo
**cuatro** solicitudes de browse de releases (cada una, una página de 100 — los primeros
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
