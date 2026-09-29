## MODIFIED Requirements

### Requirement: Página de una reseña

El sistema SHALL exponer una página pública localizada en `/{locale}/review/{slug-id}` (segmento definido por la capability `catalog-slugs`) que
muestre la reseña completa: título (cuando existe), cuerpo, autor, estrellas vigentes del
autor, fecha y el álbum reseñado (carátula, título y artistas, enlazados). La página SHALL
respetar las mismas reglas de visibilidad que el listado de reseñas (moderación, bloqueos,
cuentas desactivadas). Una dirección con slug desactualizado o con el UUID hexadecimal del formato anterior SHALL redirigir con un 308 a la dirección canónica de la misma reseña.

#### Scenario: Reseña visible

- **WHEN** una persona abre la URL de una reseña visible
- **THEN** ve la reseña completa y un enlace al álbum

#### Scenario: Reseña inexistente u oculta

- **WHEN** el id no corresponde a una reseña o la reseña no es visible para esa persona
- **THEN** la página muestra un 404 localizado

#### Scenario: Dirección del formato anterior

- **WHEN** una persona abre `/{locale}/review/<uuid-hexadecimal>` de una reseña visible
- **THEN** la respuesta es un 308 a `/{locale}/review/<slug>-<id>`

### Requirement: Reseña como modal desde el álbum

Al abrir una reseña desde el índice de la pestaña Reseñas, el sistema SHALL mostrarla en
un modal sobre la página del álbum y SHALL actualizar la URL a `/{locale}/review/{slug-id}` con el segmento canónico de esa reseña.
Cerrar el modal SHALL devolver a la página del álbum con la misma pestaña y posición de
scroll. El modal SHALL ofrecer navegación a la reseña anterior y siguiente según el orden
activo del índice, cada una enlazada con su segmento canónico, y un acceso a la página completa. Abrir, recargar o compartir esa URL
SHALL mostrar la página completa, no el modal.

#### Scenario: Abrir desde el índice

- **WHEN** una persona hace clic en una reseña del índice
- **THEN** la reseña se abre en un modal, la URL pasa a `/{locale}/review/{slug-id}` y el álbum
  sigue visible detrás

#### Scenario: Cerrar el modal

- **WHEN** la persona cierra el modal
- **THEN** vuelve a la pestaña Reseñas del álbum con el mismo scroll

#### Scenario: Recargar la URL

- **WHEN** la persona recarga el navegador con el modal abierto
- **THEN** ve la página completa de la reseña

#### Scenario: Anterior y siguiente

- **WHEN** el índice está ordenado por mejor nota y la persona pulsa "siguiente" en el modal
- **THEN** el modal muestra la siguiente reseña según ese orden y la URL pasa a su segmento canónico
