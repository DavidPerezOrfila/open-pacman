# SPEC 03 — Power pellets y modo frightened

> **Estado:** Implementado
> **Depende de:** Spec 02 (modos scatter/chase)
> **Fecha:** 2026-10-21
> **Objetivo:** las 4 power pellets del laberinto ponen a los fantasmas en modo frightened (huyen más lentos y no pueden matar) durante 8 segundos.

## Por qué existe esta spec

Las specs 01 y 02 dejaron el modo frightened fuera de alcance a propósito. Sin él el jugador nunca tiene ventaja: los fantasmas solo persiguen o se retiran. Las power pellets son el único mecanismo de revancha del arcade y el cimiento de la spec siguiente (comer fantasmas).

## Alcance

**Dentro:**

- Nuevo tile de power pellet en el laberinto: `'o'` = valor `4` en `MAZE_STR`, en las 4 posiciones clásicas (esquinas): `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`.
- Comer una power pellet: +50 puntos, se vacía la casilla y arranca el modo frightened.
- Modo frightened en `src/js/ghosts.js`, junto a scatter/chase: dura 8 s (480 frames), se descuenta en `updateGhostMode()`.
- En frightened los fantasmas huyen: target = la esquina del laberinto opuesta a Pac-Man (x opuesta e y opuesta respecto al centro).
- En frightened los fantasmas van a la mitad de velocidad (`FRIGHTENED_SPEED = 0.05`, 1/20 celda/frame) e invierten su dirección al activarse (fuera del corral, como el cambio de fase).
- Colisión con un fantasma frightened no mata: Pac-Man pasa de largo sin perder vida.
- Al comer una pellet, el temporizador de fase (scatter/chase) continúa corriendo como hasta ahora.
- `render.js` dibuja la power pellet más grande que el dot.

**Fuera (specs futuras):**

- Comer fantasmas asustados (200/400/800/1600 puntos) y contador de fantasma-comido.
- Ojos de regreso al corral tras ser comidos.
- Parpadeo blanco de los fantasmas en los últimos segundos del frightened.
- Dificultad de frightened decreciente por nivel.

## Modelo de datos

Tile nuevo en `src/js/maze.js`:

- `MAZE_STR` acepta `'o'` → `4` (power pellet). `parseTile()` lo añade; el resto de valores no cambiana.

Estado de la partida, ampliado en `createGhostMode()` (`src/js/ghosts.js`):

- `game.frightenedTimer`: frames que quedan de frightened; `0` = modo normal.

Constantes nuevas:

- `src/js/ghosts.js`: `FRIGHTENED_FRAMES = 8 * 60`.
- `src/js/game.js`: `FRIGHTENED_SPEED = 0.05`, junto a `GHOST_SPEED`.

`src/js/ghosts.js` expone:

- `frightened( game )` → `true` si `frightenedTimer > 0`.
- `startFrightened( game )` → pone `frightenedTimer = FRIGHTENED_FRAMES` e invierte la dirección de los fantasmas fuera del corral.
- `frightenedTarget( game )` → esquina opuesta a la posición de Pac-Man.
- `ghostTarget( game, i )` gana la precedencia: frightened huye > scatter corner > chase personalidad.

`createGame()` pasa a contar también las power pellets en `dotsRemaining` (las 4 cuentan para ganar la partida).

## Plan de implementación

1. `maze.js`: `'o'` → `4` en `parseTile()` y las 4 esquinas de `MAZE_STR` con `'o'`. `render.js`: tile 4 se dibuja como círculo grande. Manual: se ven 4 bolitas grandes, el juego va igual.
2. `game.js`: comer tile 4 suma 50, lo vacía y decrementa `dotsRemaining`. Manual: al comer una bolita sube el score y la bolita desaparece.
3. `ghosts.js`: `FRIGHTENED_FRAMES`, `frightened()`, `startFrightened()`; `createGhostMode()` inicializa `frightenedTimer: 0` y `updateGhostMode()` lo descuenta. `game.js` llama a `startFrightened()` al comer la pellet. Manual: al comerla los fantasmas dan media vuelta y huyen 8 s.
4. `ghosts.js`: `frightenedTarget()` y precedencia en `ghostTarget()`. Manual: los fantasmas se alejan de Pac-Man.
5. `game.js`: velocidad `FRIGHTENED_SPEED` durante el modo, y la colisión con fantasma frightened no resta vida. Manual: se puede atravesar a los fantasmas azules sin morir.
6. `tests/e2e.js`: casos de tile, puntos, duración, huida, velocidad e inmunidad. Manual: `tests/e2e.html` muestra `E2E PASS`.

## Criterios de aceptación

> Verificación automatizada: abrir `tests/e2e.html` en el navegador (o `chrome --headless=new --dump-dom tests/e2e.html`); el resumen debe decir `E2E PASS`.

- [x] El laberinto tiene 4 power pellets en `(1,3)`, `(26,3)`, `(1,23)` y `(26,23)`, dibujadas más grandes que los dots.
- [x] Comer una power pellet suma exactamente 50 puntos y decrementa `dotsRemaining` en 1.
- [x] Al comerla `frightenedTimer` pasa a 480 y los fantasmas fuera del corral invierten su dirección.
- [x] `frightened( game )` es `true` mientras `frightenedTimer > 0` y `false` al llegar a 0.
- [x] En frightened `ghostTarget()` devuelve la esquina opuesta a Pac-Man para los 4 fantasmas.
- [x] En frightened los fantasmas se mueven a 1/20 celda/frame; al terminar vuelven a 1/10.
- [x] Chocar con un fantasma frightened no resta vida ni reinicia posiciones.
- [x] Chocar con un fantasma en modo normal sigue restando vida como antes.
- [x] El temporizador scatter/chase no se pausa ni se reinicia al comer la pellet.
- [x] Vaciar el laberinto incluyendo las 4 pellets sigue poniendo `state = 'won'`.
- [x] Los 19 casos de las specs 01 y 02 siguen en verde.

## Decisiones

- **Sí:** target de huida = esquina opuesta a Pac-Man. Es determinista, testeable y se implementa en 3 líneas; el arcade usaba movimiento aleatorio, que no aporta nada observable todavía.
- **Sí:** velocidad a la mitad en frightened. Sin ello el modo dura lo mismo y el jugador apenas percibe la ventaja.
- **Sí:** inmunidad total durante frightened (no hay fantasma comestible todavía). La colisión simplemente no se evalúa en ese modo.
- **Sí:** el estado de frightened vive en `createGhostMode()`/`updateGhostMode()`, como prometió la spec 02.
- **Sí:** 8 segundos fijos. Igual que scatter/chase: una constante, ajustable cambiando un número.
- **No:** comer fantasmas y ojos de regreso. Requieren su propia lógica de respawn y marcador; va en la spec 04.
- **No:** parpadeo blanco al final del frightened. Efecto visual sin reglas; se añade encima cuando exista la spec 04.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Las pellets caen en filas con geometría especial (túnel en 14 no afecta) | Las 4 posiciones están en filas 3 y 23, lejos del túnel |
| La inmunidad cambia la dificultad percibida | Los e2e fijan el comportamiento; jugar una partida antes de cerrar |
| `dotsRemaining` cuenta ahora 240 + 4 en vez de 240 | El recuento se hace en un solo bucle en `createGame()`; el criterio de victoria no cambia |
| Velocidades 1/20 y 1/10 comparten el tramo de alineación | Ambas son `1/N`, misma suposición que `PACMAN_SPEED` |

## Qué NO entra en esta spec

- Comer fantasmas asustados y su marcador (200/400/800/1600).
- Ojos de regreso al corral y respawn.
- Parpadeo de los fantasmas al terminar el modo.
- Dificultad o duración por nivel.

Cada uno, si llega, va en su propia spec.
