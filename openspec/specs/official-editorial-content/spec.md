# Official Editorial Content

## Purpose

Publicación editorial oficial de listas y distinción visual en superficies de descubrimiento.

## Requirements

### Requirement: Publicación editorial oficial

El sistema SHALL permitir que un administrador publique listas editoriales oficiales distinguibles
de las listas personales. La marca oficial no SHALL ser editable por el propietario común de una
lista y el contenido oficial SHALL conservar un actor administrativo identificable.

#### Scenario: Administrador publica lista oficial
- **WHEN** un administrador crea o marca una lista para publicación editorial
- **THEN** la lista aparece como contenido oficial en las superficies editoriales

#### Scenario: Usuario común intenta publicar contenido oficial
- **WHEN** un usuario sin permiso editorial intenta marcar una lista como oficial
- **THEN** la API responde `403` y la lista conserva su origen personal

### Requirement: Descubrimiento editorial distingue el origen

Las superficies públicas que muestran listas editoriales SHALL distinguir visualmente el contenido
oficial del contenido de usuarios y SHALL excluir listas ocultas por moderación.

#### Scenario: Lista oficial visible
- **WHEN** una persona visita el descubrimiento público con una lista editorial publicada
- **THEN** ve la lista con una indicación localizada de contenido oficial

#### Scenario: Lista editorial moderada
- **WHEN** una lista oficial está oculta por moderación
- **THEN** no aparece en el descubrimiento público hasta ser restaurada
