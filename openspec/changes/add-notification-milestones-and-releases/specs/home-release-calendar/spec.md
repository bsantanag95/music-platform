## MODIFIED Requirements

### Requirement: Discos mostrados enlazan al catálogo
Cada disco elegido para el riel SHALL registrarse como stub de `release_group` (con sus créditos) si no
existía, de modo que la tarjeta enlace a `/album/{id}` y la carátula salga del pipeline existente
(miniatura de 250px, espejo). Solo los discos mostrados (en el riel o en un aviso de lanzamiento a quien sigue a su artista, ver
`notifications`) SHALL entrar al catálogo. Al vincular los discos de artistas con relación, los de artistas seguidos
SHALL ir primero, para que el tope de vínculos no deje sin aviso a quien los sigue. La fecha que muestra la
tarjeta SHALL ser la fecha de primer lanzamiento verificada.

#### Scenario: Disco nuevo en el riel
- **WHEN** un disco que no estaba en el catálogo entra en la selección anónima
- **THEN** existe un `release_group` con su MBID y la tarjeta enlaza a su página

#### Scenario: Candidato no elegido
- **WHEN** un disco del calendario cumple los filtros pero queda fuera de los 24 elegidos
- **THEN** no se crea ninguna fila de catálogo para él

#### Scenario: Sencillo de un artista seguido

- **WHEN** alguien que sigue a un artista activó los avisos de sencillos y el feed trae un sencillo de ese artista
- **THEN** el sencillo se verifica y se vincula al catálogo para el aviso, y no aparece en el riel
