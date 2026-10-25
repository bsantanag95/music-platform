## MODIFIED Requirements

### Requirement: Editar y quitar una entrada propia
El sistema SHALL permitir al dueño de una entrada editar su formato, atributos, nota y
audiencia, y eliminarla por su identificador, **desde la superficie `/me/collection`** además de
desde la página del álbum. La edición desde la estantería SHALL usar el mismo formulario de
formato/atributos/nota que el alta, con los atributos agrupados por tipo, presentado en una hoja
lateral que no desplaza la página, y SHALL reflejar el cambio de forma optimista, revirtiendo si
la API falla. Quitar una entrada que no existe o que no pertenece al usuario SHALL responder
`404` sin revelar su existencia.

En `/me/collection`, cada copia SHALL ofrecer un menú `⋯` con "Editar copia…", las tres
audiencias (marcada la vigente) y "Quitar", con la misma forma en los tres modos de
visualización. Tras quitar, la superficie SHALL ofrecer "Deshacer" durante unos segundos, que
vuelve a crear la copia con el mismo álbum, formato, atributos, nota y audiencia. El quitado
SHALL anunciarse a lectores de pantalla y, si falla, el error SHALL mostrarse junto a esa
entrada.

#### Scenario: Editar una entrada propia desde la estantería
- **WHEN** el dueño elige "Editar copia…" en el menú de una entrada en `/me/collection` y cambia
  su formato o sus atributos en la hoja lateral
- **THEN** la entrada queda actualizada, la superficie refleja el cambio de inmediato y, si la
  API falla, la ficha vuelve a su estado anterior con un aviso de error

#### Scenario: Cambiar la audiencia de una entrada desde la ficha
- **WHEN** el dueño elige otra audiencia en el menú `⋯` de una entrada
- **THEN** la entrada queda con la audiencia elegida sin necesidad de abrir la hoja de edición

#### Scenario: Quitar una entrada propia
- **WHEN** el dueño elimina una entrada propia por su identificador
- **THEN** la entrada se elimina y desaparece de la colección

#### Scenario: Quitar una entrada ajena o inexistente
- **WHEN** un usuario intenta eliminar una entrada que no es suya o no existe
- **THEN** la API responde `404` con código `COLLECTION_ENTRY_NOT_FOUND` y no elimina nada

#### Scenario: Sesión requerida para editar
- **WHEN** una request sin sesión intenta editar o eliminar una entrada
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: Quitar desde la Estantería
- **WHEN** el dueño abre el menú `⋯` de una ficha en modo Estantería
- **THEN** el menú ofrece "Quitar" además de "Editar copia…" y las audiencias

#### Scenario: Deshacer un quitado
- **WHEN** el dueño quita una copia y pulsa "Deshacer" en el aviso
- **THEN** la copia vuelve a la colección con el mismo álbum, formato, atributos, nota y audiencia

#### Scenario: Falla al quitar
- **WHEN** la API falla al quitar una copia
- **THEN** la copia vuelve a su lugar y el error aparece junto a ella

#### Scenario: Atributos agrupados en la hoja
- **WHEN** el dueño edita una copia en CD
- **THEN** la hoja muestra los atributos bajo "Edición", "Soporte", "Región y contenido" y
  "Otros", sin las opciones exclusivas de vinilo

### Requirement: Modos de visualización de la colección
El sistema SHALL presentar la colección —propia y en la vista de perfil— en tres modos de
visualización a elegir por el visitante:

- **Estantería**: cuadrícula de carátulas cuadradas donde predomina lo visual, con el título, el
  artista con el año del álbum y el formato con su primer atributo al pie de cada ficha.
- **Lista detallada**: filas compactas separadas por una línea con carátula, título, artista con
  el año, formato, atributos, nota, audiencia y fecha. Cuando la colección se agrupa por artista,
  la fila SHALL NOT repetir el artista del encabezado.
- **Índice**: una tabla con posición, álbum, artista, formato, edición, fecha de alta y las
  acciones de la fila, sin reservar espacio oculto.

La preferencia de modo SHALL guardarse **local por visitante** (no en servidor) y SHALL ser
**global** a la colección (no una preferencia por página ni por usuario mirado). El modo por
defecto SHALL ser **Estantería**. Un valor de preferencia inválido o ausente SHALL caer al modo
por defecto sin error. El modo SHALL NOT viajar en la URL ni alterar la consulta de datos.
Hasta leer la preferencia guardada, la superficie SHALL mostrar un marcador neutro en lugar de
pintar un modo y saltar a otro. Cuando una entrada no tiene carátula resuelta, cualquier modo
SHALL usar la silueta de disco del sistema en lugar de un recuadro vacío.

#### Scenario: Elegir un modo de visualización
- **WHEN** el visitante cambia de "Estantería" a "Índice"
- **THEN** la colección se re-renderiza en ese modo y la preferencia queda guardada localmente

#### Scenario: La preferencia persiste entre páginas y recargas
- **WHEN** el visitante que eligió "Lista detallada" recarga o navega a la colección de otra
  persona
- **THEN** la colección se muestra en "Lista detallada" sin volver a pedirle la elección

#### Scenario: Preferencia inicial o corrupta
- **WHEN** el visitante no tiene preferencia guardada, o el valor guardado no es un modo válido
- **THEN** la colección se muestra en "Estantería" sin error

#### Scenario: Entrada sin carátula
- **WHEN** una entrada apunta a un álbum sin carátula resuelta
- **THEN** su ficha muestra la silueta de disco del sistema en cualquiera de los tres modos

#### Scenario: Sin salto de modo al cargar
- **WHEN** el visitante que eligió "Índice" abre la colección
- **THEN** ve un marcador neutro hasta que se lee su preferencia y luego el Índice, sin pintar
  antes la Estantería

#### Scenario: Año del álbum
- **WHEN** una copia es de un álbum publicado en 1987
- **THEN** su ficha dice "Guns N' Roses · 1987" junto al título

## ADDED Requirements

### Requirement: Quitar varias copias a la vez
En el modo selección de `/me/collection`, el dueño SHALL poder marcar todas las copias cargadas
de una vez y quitar las marcadas tras confirmarlo. Si alguna no se puede quitar, la colección
SHALL volver a su estado anterior y la superficie SHALL avisar del error. Quitar en lote SHALL
NOT ofrecer "Deshacer".

#### Scenario: Quitar tres copias
- **WHEN** el dueño marca tres copias, pulsa "Quitar" en la barra y lo confirma
- **THEN** las tres dejan la colección y la pestaña Tengo descuenta tres

#### Scenario: Cancelar el quitado en lote
- **WHEN** el dueño pulsa "Quitar" en la barra y luego "Cancelar"
- **THEN** no se quita ninguna copia y la selección se conserva

#### Scenario: Marcar todo
- **WHEN** el dueño pulsa "Seleccionar todo"
- **THEN** quedan marcadas todas las copias cargadas
