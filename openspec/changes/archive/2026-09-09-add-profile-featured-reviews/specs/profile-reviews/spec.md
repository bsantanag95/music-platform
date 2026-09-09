## ADDED Requirements

### Requirement: Sección "Reseñas" del perfil

El perfil de un usuario SHALL incluir una sección **"Reseñas"** que muestra las reseñas de
álbum del dueño más recientes que el lector tiene permitido ver. El cálculo SHALL ser bajo
demanda, sin tabla materializada, y SHALL memoizarse dentro del request (mismo criterio que
la huella de gusto y la sección "En rotación").

**Qué muestra.** SHALL mostrar hasta un máximo acotado de reseñas, ordenadas por **fecha de
última edición descendente**. Cada reseña SHALL presentarse como una tarjeta con: la
carátula del álbum (o el disco cuando no hay arte), el título del álbum enlazado a su
página, el nombre del artista acreditado, el **rating que la reseña lleva incorporada** con
su representación visual y su valor numérico, el **título de la reseña** cuando existe, y el
**cuerpo recortado** a unas pocas líneas. La tarjeta NO SHALL ofrecer un control de
expandir el cuerpo: el enlace al álbum lleva a la reseña completa y al resto de reseñas de
esa obra. Cuando el dueño tiene más reseñas visibles que el tope, la sección SHALL
indicarlo de forma informativa, sin un enlace dedicado.

**Automática, no curada.** La sección NO SHALL ofrecer un mecanismo de fijado o curación de
reseñas: se muestran las más recientes. El máximo y el recorte del cuerpo SHALL ser
constantes con nombre, calibrables sin cambio de esta especificación.

**Visibilidad.** La sección SHALL mostrarse solo cuando el perfil es accesible para el
lector (perfil público, seguidor aprobado, o el propio dueño) y no hay bloqueo en ninguna
dirección. Una reseña no tiene audiencia propia (es contenido público, visible en la página
del álbum); la sección no SHALL filtrar además por relación de seguimiento como lo hacen
los ratings sueltos. Cuando el dueño no tiene ninguna reseña visible para el lector, la
sección NO SHALL renderizarse (sin encabezado ni hueco).

**Ubicación.** La sección SHALL ubicarse después de los destacados y antes de la sección
"En rotación", tanto en la vista del dueño como en la de un visitante autorizado.

#### Scenario: Perfil con reseñas visibles

- **WHEN** un lector abre un perfil accesible cuyo dueño ha escrito reseñas de álbum
- **THEN** ve la sección "Reseñas" con hasta el máximo de tarjetas, cada una con la
  carátula, el álbum enlazado, el artista, el rating de la reseña, su título si tiene y su
  cuerpo recortado

#### Scenario: Orden por última edición

- **WHEN** el dueño edita una reseña vieja
- **THEN** esa reseña pasa a encabezar la sección "Reseñas" del perfil

#### Scenario: Más reseñas que el tope

- **WHEN** el dueño tiene más reseñas visibles que el máximo de la sección
- **THEN** la sección muestra las más recientes hasta el tope e indica cuántas más hay, sin
  un enlace dedicado

#### Scenario: Sin reseñas

- **WHEN** el dueño no ha escrito ninguna reseña, o ninguna es visible para el lector
- **THEN** la sección "Reseñas" no se renderiza

#### Scenario: Perfil privado sin relación aceptada

- **WHEN** el dueño tiene perfil privado y el lector no es un seguidor aprobado ni el
  propio dueño
- **THEN** la sección "Reseñas" no aparece (como el resto del perfil para ese lector)

#### Scenario: Bloqueo entre lector y dueño

- **WHEN** existe un bloqueo en cualquier dirección entre el lector y el dueño del perfil
- **THEN** la sección "Reseñas" no aparece

#### Scenario: Sin curación

- **WHEN** el dueño ve su propia sección "Reseñas"
- **THEN** no hay ningún control para fijar, destacar ni reordenar reseñas; se muestran las
  más recientes

#### Scenario: La tarjeta no expande el cuerpo

- **WHEN** el cuerpo de una reseña supera el recorte de la tarjeta
- **THEN** el cuerpo se muestra recortado sin un botón de "ver más"; el enlace al álbum
  lleva a la reseña completa
