## ADDED Requirements

### Requirement: Apertura con un objetivo ya elegido

Otras superficies con sesión (como Inicio) SHALL poder abrir el mismo diálogo de acciones rápidas
en **Escucha** con un objetivo del catálogo ya elegido, mostrando directamente el panel de Escucha
para ese objetivo en lugar del buscador, con las mismas reglas de accesibilidad del diálogo. Sin
confirmación, el panel SHALL registrar la escucha al abrirse, como al elegir el objetivo en el
buscador. Con confirmación, el panel SHALL mostrar el objetivo y las acciones «Registrar escucha»
(con el foco) y «Elegir otro» (vuelve al buscador), y SHALL NOT crear la escucha hasta que la
persona active «Registrar escucha». En ambos casos, después de registrar, el panel SHALL
comportarse como la Acción Escucha (ampliar los detalles, "Registrar otra", enlace al diario).

#### Scenario: Abrir con objetivo sin confirmación
- **WHEN** Inicio abre el diálogo con el álbum «Dr. Feelgood» sin confirmación
- **THEN** el diálogo muestra el chip "Escucha" seleccionado, se crea una escucha con audiencia
  `private` de ese álbum y se ofrece ampliarla

#### Scenario: Abrir con objetivo y confirmación
- **WHEN** Inicio abre el diálogo con el álbum «Too Fast for Love» y confirmación
- **THEN** el diálogo muestra el álbum con "Registrar escucha" enfocado y no hay escucha nueva
  hasta activarlo

#### Scenario: Elegir otro desde la confirmación
- **WHEN** en la confirmación la persona activa "Elegir otro"
- **THEN** el diálogo muestra el buscador de objetivos en Escucha con el foco en él y no se creó
  ninguna escucha

## MODIFIED Requirements

### Requirement: Diálogo de acciones rápidas en el Header

El Header SHALL ofrecer, solo con sesión, un control **"Añadir"** en la zona de usuario —junto al menú de
usuario, no en la barra general de navegación de contenido— que abre un diálogo de acciones rápidas sin navegar
a otra ruta. El diálogo SHALL presentar sus acciones como una fila de chips con
semántica de grupo de opciones (`radiogroup`, navegables con flechas), en este orden: **Escucha**, **Valorar**,
**Favorito**, **Pendiente**, **Colección**, **Recorrido**, **Seguir artista**, **A lista**, **Nueva lista** y
**Nuevo Camino**. Abierto
desde el control "Añadir", el diálogo SHALL abrirse siempre con **Escucha** seleccionada y el
foco en el buscador, sin recordar la acción usada la última vez; otras superficies pueden abrirlo
con un objetivo ya elegido (ver Requirement: Apertura con un objetivo ya elegido). El diálogo SHALL ser accesible: renderizarse en
un portal, atrapar el foco, cerrarse con `Escape` devolviendo el foco al control, bloquear el desplazamiento de la
página y rotular cada chip y cada estado. Cerrar el diálogo SHALL NOT deshacer lo ya guardado.

#### Scenario: Abre en Escucha con el buscador enfocado

- **WHEN** una persona con sesión activa el control "Añadir"
- **THEN** se abre el diálogo con el chip "Escucha" seleccionado y el foco en el buscador de objetivos

#### Scenario: Sin sesión no se ofrece

- **WHEN** se renderiza el Header sin sesión
- **THEN** la zona de usuario no muestra el control "Añadir"

#### Scenario: Cambiar de acción conserva la búsqueda

- **WHEN** una persona escribe "Dr. Feelgood" con el chip "Escucha" y cambia al chip "Valorar"
- **THEN** el texto de búsqueda y el tipo de objetivo se conservan y no se registra ninguna escucha

#### Scenario: Cerrar no deshace

- **WHEN** una persona marca un favorito desde el diálogo y lo cierra con `Escape`
- **THEN** el favorito persiste y el foco vuelve al control "Añadir"
