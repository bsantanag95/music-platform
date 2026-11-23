## MODIFIED Requirements

### Requirement: Bloque de comunidad del artista

La ficha de la portada del artista SHALL mostrar la comunidad como una parte de su primera línea con tres cifras: **oyentes**
(personas distintas con al menos una escucha del artista o de un disco de su discografía propia), **seguidores** (personas
distintas que siguen al artista; la cantidad de personas que lo tienen como favorito SHALL estar disponible como detalle de esa
cifra, también para lectores de pantalla) y **listas** (listas visibles que contienen al artista, enlazadas a ellas). Cada cifra
en 0 SHALL omitirse, y la parte entera SHALL omitirse si las tres son 0. Los agregados SHALL ser iguales para cualquier visitante,
autenticado o no, y el detalle de favoritos SHALL usar la misma forma compacta "<5" que la cifra principal.

#### Scenario: Artista con actividad

- **WHEN** un artista tiene 312 oyentes, 120 seguidores, 34 favoritos y aparece en 12 listas
- **THEN** la ficha muestra "312 oyentes · 120 seguidores · 12 listas", con "34 lo tienen de favorito" como detalle de los
  seguidores y "12 listas" enlazado

#### Scenario: Pocos favoritos

- **WHEN** 3 personas tienen al artista como favorito
- **THEN** el detalle muestra "<5 lo tienen de favorito" y los lectores de pantalla anuncian "menos de 5"

#### Scenario: Cifras en cero

- **WHEN** un artista tiene 3 oyentes, ningún seguidor y ninguna lista
- **THEN** la ficha muestra "<5 oyentes" y no muestra seguidores ni listas

#### Scenario: Sin actividad

- **WHEN** un artista no tiene oyentes, seguidores ni listas
- **THEN** la ficha no muestra la parte de comunidad

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el artista
- **THEN** ve las mismas cifras que un usuario autenticado
