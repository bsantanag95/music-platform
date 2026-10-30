## MODIFIED Requirements

### Requirement: Bloque de comunidad del artista

La cabecera del artista SHALL mostrar un bloque de comunidad con tres tarjetas: **Oyentes**
(personas distintas con al menos una escucha del artista o de un disco de su discografía
propia), **Seguidores** (personas distintas que siguen al artista, con la cantidad de
personas que lo tienen como favorito en la misma tarjeta) y **Listas** (listas visibles que
contienen al artista, enlazadas a ellas). Los agregados SHALL ser iguales para cualquier
visitante, autenticado o no. Cada tarjeta SHALL mostrar la cifra primero y la etiqueta debajo,
y el detalle de favoritos SHALL usar la misma forma compacta "<5" que la cifra principal.

#### Scenario: Artista con actividad

- **WHEN** un artista tiene 312 oyentes, 120 seguidores, 34 favoritos y aparece en 12 listas
- **THEN** el bloque muestra "312 Oyentes", "120 Seguidores · 34 lo tienen de favorito" y "12
  En listas" con enlace

#### Scenario: Pocos favoritos

- **WHEN** 3 personas tienen al artista como favorito
- **THEN** el detalle muestra "<5 lo tienen de favorito" y los lectores de pantalla anuncian
  "menos de 5"

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el artista
- **THEN** ve el mismo bloque que un usuario autenticado
