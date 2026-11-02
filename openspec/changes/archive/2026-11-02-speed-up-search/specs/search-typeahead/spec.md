## ADDED Requirements

### Requirement: Sugerencias estables mientras se escribe

Mientras se piden las sugerencias de una consulta nueva del mismo tipo, el desplegable SHALL seguir
mostrando las sugerencias de la consulta anterior, marcadas como pendientes (listbox con
`aria-busy="true"` y filas atenuadas), y SHALL reemplazarlas cuando llegue la respuesta nueva. El
desplegable SHALL NOT quedar solo con las acciones entre una tecla y su respuesta. Cambiar de tipo,
o dejar menos de 2 caracteres, SHALL vaciar las sugerencias, porque las anteriores ya no
corresponden. Si la respuesta nueva falla, SHALL aplicarse "Falla silenciosa de sugerencias" (las
sugerencias anteriores se retiran).

#### Scenario: Escribir letra a letra
- **WHEN** una persona escribe `pink floyd` en Artistas a ritmo normal y tras `pink` ya se ven
  sugerencias
- **THEN** en cada tecla siguiente las sugerencias anteriores siguen visibles (atenuadas) hasta que
  llegan las nuevas, sin que el desplegable se reduzca a las acciones

#### Scenario: Cambiar de tipo
- **WHEN** hay sugerencias de Artistas y la persona cambia el tipo a Álbumes
- **THEN** las sugerencias de Artistas se retiran y se muestran las de Álbumes al llegar

### Requirement: Tiempo de respuesta de las sugerencias de Artistas y Álbumes

Sobre la base de scratch, la respuesta de `/api/search/suggest` para Artistas y Álbumes SHALL NOT
superar 40 ms (mediana de varias ejecuciones) cuando las coincidencias por subcadena llenan el cupo
de candidatos, también con palabras muy comunes en los títulos (`the d`), y cuando el puente
artista + título encuentra varios artistas homónimos (`soda st`). El puente SHALL hacer una consulta
de álbumes por resto de título distinto, no una por artista. Las consultas que necesitan completar
con similitud por trigramas (pocas subcadenas, erratas, títulos largos con el artista delante como
`pink floyd the wall`) quedan fuera de este presupuesto y SHALL NOT ser más lentas que antes de este
cambio (ver "Subcadena primero en la coincidencia local" en `search-query-matching`).

#### Scenario: Palabra común en Álbumes
- **WHEN** se piden sugerencias de Álbumes para `the d`
- **THEN** la mediana de varias ejecuciones es de 40 ms o menos

#### Scenario: Consulta que completa por similitud
- **WHEN** se piden sugerencias de Álbumes para `pink floyd the wall`
- **THEN** la mediana no supera la de antes de este cambio (80 ms en la medición del 2026-11-02)

#### Scenario: Puente con homónimos
- **WHEN** se piden sugerencias de Artistas para `soda st` y la base tiene más de veinte artistas
  llamados Soda
- **THEN** la mediana de varias ejecuciones es de 40 ms o menos y el puente hace una sola consulta
  de álbumes
