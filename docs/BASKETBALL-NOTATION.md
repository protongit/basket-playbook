# Notación de pizarra

Basket Playbook usa la notación habitual de las pizarras de baloncesto. El objetivo es que cualquier jugador pueda leer el diagrama sin explicación adicional.

La pista está dibujada a escala FIBA: 28 × 15 m, aro a 1,575 m de la línea de fondo, zona de 4,90 × 5,80 m, círculo de tiro libre de 1,80 m, 3 puntos de 6,75 m y esquinas a 0,90 m de la banda. El balón incluye costuras y sombra para que se lea como un balón real.

| Elemento | Representación en la app | Interacción |
|---|---|---|
| Atacante | Círculo naranja con **1–5** | Arrastrar |
| Defensor | Círculo azul con **X1–X5** | Arrastrar |
| Balón | Anillo amarillo + balón naranja junto al jugador | Seleccionar jugador → “Dar balón” |
| Corte | Flecha sólida naranja | Acción `cut` |
| Bote | Línea en zigzag | Acción `dribble` |
| Pase | Línea discontinua con flecha | Acción `pass`; destino = nuevo portador |
| Bloqueo | Línea con barra perpendicular (T) | Acción `screen` |
| Mano a mano | Línea con marcas cruzadas | Acción `handoff` |
| Tiro | Diana en el punto final | Acción `shot` |
| Caída / continuación | Flecha curva | Acción `roll` |
| Apertura | Flecha curva inversa | Acción `pop` |
| Rotación defensiva | Flecha azul fina | Acción `rotation` |
| Sin acción | — | Acción `stand` |

## Puntos de referencia

La app reconoce y ofrece snap a las posiciones habituales:

- cabecera, slots, alas, esquinas;
- codos, poste alto, poste bajo, dunker;
- aro, línea de fondo, media pista.

## Secuencia

Cada bloque de la línea de tiempo es una **fotografía de posiciones**. La transición entre el bloque A y B muestra la acción que lleva de uno a otro. El usuario puede:

- duplicar un bloque y mover jugadores;
- cambiar el tipo de acción;
- asignar el balón;
- añadir una nota por bloque;
- definir una duración de transición.

## Terminología útil en español

- **Bloqueo directo**: bloqueo al jugador con balón (pick and roll).
- **Bloqueo indirecto**: bloqueo a un jugador sin balón (pin down, UCLA, zipper, flex, stagger).
- **Mano a mano**: handoff.
- **Puerta atrás**: backdoor cut.
- **Rizo**: curl.
- **Apertura**: flare.
- **Caída**: roll.
- **Continuación**: second action after a screen.
- **BLOB / SLOB / ATO**: baseline out of bounds, sideline out of bounds, after timeout.

La app usa los mismos nombres en la ficha de la jugada para que el playbook hable el idioma del cuerpo técnico.
