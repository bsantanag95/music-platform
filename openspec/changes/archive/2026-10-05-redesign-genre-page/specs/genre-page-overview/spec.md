## ADDED Requirements

### Requirement: Cifras de la cabecera

La cabecera del género SHALL mostrar la cantidad de álbumes del género o de sus subgéneros y la cantidad de artistas
con el género o un subgénero entre sus semillas (de tipo conocido). Cuando el género o sus subgéneros acumulen al menos
5 valoraciones, SHALL mostrar además la media de estrellas y la cantidad de valoraciones de esos álbumes; bajo ese
umbral SHALL omitir ambas cifras. SHALL mostrar la década con más álbumes ("década de auge") solo cuando los álbumes
abarquen al menos dos décadas. El servicio SHALL aplicar los umbrales: la interfaz no recibe cifras bajo el umbral.

#### Scenario: Género con comunidad

- **WHEN** un género tiene 412 álbumes, 138 artistas y 1.204 valoraciones
- **THEN** la cabecera muestra las tres cifras y la media de estrellas

#### Scenario: Pocas valoraciones

- **WHEN** los álbumes del género suman 3 valoraciones
- **THEN** la cabecera muestra álbumes y artistas y no muestra media ni cantidad de valoraciones

#### Scenario: Una sola década

- **WHEN** todos los álbumes del género son de la misma década
- **THEN** la cabecera no muestra la década de auge

### Requirement: Árbol del género

El Resumen SHALL mostrar el lugar del género en la taxonomía: sus géneros padre, el género actual y sus subgéneros
directos de estilo. Cada subgénero SHALL indicar la cantidad de álbumes de su subárbol y los subgéneros SHALL ordenarse
por esa cantidad descendente y, a igualdad, por nombre. Los subgéneros sin álbumes SHALL mostrarse atenuados al final
y SHALL omitirse si ninguno tiene álbumes. A partir de 12 subgéneros la lista SHALL mostrar los 12 primeros y el resto
tras un control desplegable. Los géneros cercanos (fusión de, luego influido por; hasta 8, sin repetir padres ni
subgéneros) SHALL mostrarse aparte. Cada género SHALL enlazar a su página.

#### Scenario: Subgéneros ordenados por tamaño

- **WHEN** un género tiene los subgéneros A (3 álbumes) y B (40 álbumes)
- **THEN** B aparece antes que A, cada uno con su cantidad

#### Scenario: Muchos subgéneros

- **WHEN** un género tiene 20 subgéneros con música
- **THEN** se muestran 12 y el resto queda tras un control desplegable

#### Scenario: Subgéneros sin música

- **WHEN** ningún subgénero tiene álbumes
- **THEN** el árbol no muestra la fila de subgéneros

### Requirement: Rieles de Esenciales y Novedades

El Resumen SHALL mostrar el riel "Esenciales" con los álbumes del género o de sus subgéneros mejor valorados: solo
álbumes con al menos 3 valoraciones, por promedio descendente, hasta 12, y SHALL omitir el riel si hay menos de 6
álbumes elegibles. SHALL mostrar el riel "Novedades" con los álbumes de estudio y single/EP del género con año de
lanzamiento conocido, por año descendente, hasta 12, y SHALL omitirlo si no hay ninguno. Cada riel SHALL ofrecer
"Ver todo →" hacia la pestaña Álbumes con el orden correspondiente (`orden=mejor` en Esenciales y
`orden=recientes` en Novedades) y SHALL usar las tarjetas de álbum con sus acciones.

#### Scenario: Esenciales con suficiente comunidad

- **WHEN** 8 álbumes del género tienen al menos 3 valoraciones
- **THEN** el riel Esenciales los muestra del mejor promedio al peor

#### Scenario: Esenciales sin comunidad suficiente

- **WHEN** solo 4 álbumes del género tienen al menos 3 valoraciones
- **THEN** el Resumen no muestra el riel Esenciales

#### Scenario: Novedades

- **WHEN** el género tiene álbumes de estudio de 2024 y 2019
- **THEN** el riel Novedades muestra primero el de 2024

### Requirement: Distribución por década

El Resumen SHALL mostrar un gráfico de barras con la cantidad de álbumes del género por década cuando abarquen al
menos dos décadas, con una alternativa textual accesible (tabla o lista). Cada barra SHALL enlazar a la pestaña Álbumes
filtrada por esa década (`decada=`). SHALL omitirse con menos de dos décadas.

#### Scenario: Varias décadas

- **WHEN** el género tiene álbumes de las décadas de 1970, 1980 y 1990
- **THEN** el gráfico muestra tres barras y cada una enlaza a `?tab=albums&decada=<año>`

### Requirement: Artistas en el Resumen

El Resumen SHALL mostrar hasta 8 tarjetas de artistas con el mismo contenido y orden que la pestaña Artistas y
"Ver todo →" hacia ella. SHALL omitir la sección si no hay artistas.

#### Scenario: Ver todos los artistas

- **WHEN** el género tiene 40 artistas
- **THEN** el Resumen muestra 8 y "Ver todo →" lleva a `?tab=artists`

### Requirement: Secciones que se omiten sin datos

Toda sección del Resumen SHALL omitirse por completo cuando su lectura devuelva menos de su mínimo; el Resumen SHALL
NOT mostrar encabezados de sección sin contenido. Las lecturas SHALL aplicar los umbrales en el servicio, de modo que
una sección bajo su umbral no se renderice aunque el componente reciba datos vacíos.

#### Scenario: Género con pocos datos

- **WHEN** un género tiene 2 álbumes sin valoraciones ni listas ni reseñas
- **THEN** el Resumen muestra la cabecera, el árbol, Novedades y los artistas, y ninguna otra sección
