# artist-community-stats Specification

## Purpose
Mostrar en la cabecera del artista oyentes, seguidores con favoritos y listas, con el umbral mínimo de 5 y sin exponer identidades ni agregar recorridos.
## Requirements
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

### Requirement: Umbral mínimo de agregados del artista

Oyentes, seguidores y favoritos SHALL mostrarse como "menos de 5" cuando el valor real es
mayor que 0 y menor que 5, con la forma compacta "<5" y el texto completo para lectores de
pantalla, igual que en el álbum. Con 0, SHALL mostrarse 0 u omitirse la cifra, sin "menos de
5". La tarjeta de listas sin listas SHALL mostrarse sin enlace.

#### Scenario: Pocos seguidores

- **WHEN** 3 personas siguen al artista
- **THEN** la tarjeta muestra "<5" y los lectores de pantalla anuncian "menos de 5"

### Requirement: Anonimato y exclusiones

Los agregados SHALL contar personas distintas de cuentas activas, incluir entradas de
cualquier audiencia y SHALL NOT exponer la identidad de ninguna persona. El bloque SHALL NOT
mostrar un promedio de estrellas del artista, ni un conteo de Pendiente, ni ningún agregado
de recorridos.

#### Scenario: Escuchas privadas

- **WHEN** una persona escuchó discos del artista con audiencia privada
- **THEN** cuenta en Oyentes y el bloque no ofrece forma de saber quién es

#### Scenario: Recorridos no se agregan

- **WHEN** muchas personas tienen recorridos del artista
- **THEN** el bloque no muestra ninguna cifra de recorridos

