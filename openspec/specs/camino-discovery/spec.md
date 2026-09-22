# camino-discovery Specification

## Purpose

Descubrimiento público de Caminos y listas de álbumes populares, vía `/caminos`: una vitrina
accesible con y sin sesión, ordenada por conteo de trackeo activo (capability `list-saves`,
Requirement "Trackear el progreso propio sobre una lista ajena"), con filtros por género y por
artista. Mismo criterio que "Populares" en `/lists`: sin ranking ni comparación individual entre
usuarios.

## Requirements

### Requirement: Descubrimiento público de Caminos populares
El sistema SHALL exponer una superficie pública (`/caminos`, accesible con y sin sesión) que lista
las listas de álbumes visibles (`entityType = 'release-group'`, `kind` `standard` o
`custom_journey`, audiencia `public`) ordenadas por su **conteo de trackeo activo** — la cantidad
de usuarios que activaron tracking de progreso sobre ellas (Requirement "Trackear el progreso
propio sobre una lista ajena" de la capability `list-saves`) —, no por su conteo simple de
guardados. Solo SHALL listarse listas con al menos un trackeo activo. La identidad de quién
trackea SHALL permanecer privada, mismo criterio que ya rige para el guardado de listas — solo se
expone el conteo agregado.

#### Scenario: Orden por trackeo activo
- **WHEN** una persona (con o sin sesión) abre `/caminos`
- **THEN** ve las listas de álbumes públicas ordenadas de mayor a menor conteo de trackeo activo

#### Scenario: Lista sin trackeo activo
- **WHEN** una lista de álbumes pública no tiene ningún trackeo activo
- **THEN** no aparece en `/caminos`

#### Scenario: Identidad de quien trackea sigue privada
- **WHEN** una persona ve el conteo de trackeo de una lista en `/caminos`
- **THEN** no puede saber qué usuarios activaron ese tracking

### Requirement: Filtro por género
El sistema SHALL permitir filtrar `/caminos` por género, considerando una lista como coincidente
si al menos uno de sus álbumes tiene esa etiqueta de género registrada.

#### Scenario: Filtrar por un género
- **WHEN** una persona filtra `/caminos` por un género
- **THEN** ve solo las listas con al menos un álbum etiquetado con ese género

#### Scenario: Filtro sin resultados
- **WHEN** ningún álbum de ninguna lista trackeada coincide con el género elegido
- **THEN** el sistema muestra un estado vacío localizado de "sin resultados", distinto del estado
  vacío de "todavía no hay Caminos populares"

### Requirement: Filtro por artista
El sistema SHALL permitir filtrar `/caminos` por artista, considerando una lista como coincidente
si al menos uno de sus álbumes está acreditado a ese artista.

#### Scenario: Filtrar por un artista
- **WHEN** una persona filtra `/caminos` por un artista
- **THEN** ve solo las listas con al menos un álbum acreditado a ese artista

#### Scenario: Combinar filtro de género y artista
- **WHEN** una persona aplica un filtro de género y de artista a la vez
- **THEN** ve solo las listas que cumplen ambos filtros

### Requirement: Vitrina, no ranking
El sistema SHALL presentar `/caminos` como una vitrina de descubrimiento, mismo criterio que
"Populares" en `/lists`: cada tarjeta SHALL mostrar el conteo de trackeo ("N siguiendo su
progreso" o equivalente) sin número de posición ni distintivo de "top", y SHALL NOT introducir
ninguna comparación de velocidad o cantidad de trackeos entre usuarios individuales.

#### Scenario: Sin posiciones numeradas
- **WHEN** una persona ve la vitrina de `/caminos`
- **THEN** cada tarjeta muestra su conteo de trackeo sin número de posición ni insignia de "top"
