# SPEC 02 â€” Modos scatter y chase

> **Estado:** Implemented
> **Depende de:** Spec 01 (personalidades)
> **Fecha:** 2026-10-21
> **Objetivo:** los cuatro fantasmas alternan una fase de retirada a su esquina (scatter) y otra de persecuciÃ³n (chase), con media vuelta al cambiar de fase.

## Por quÃ© existe esta spec

La spec 01 dejÃ³ el scatter fuera de alcance a propÃ³sito y sembrÃ³ `corner` en cada entrada de `GHOSTS` para este momento. Sin scatter los fantasmas persiguen sin pausa desde el primer segundo: la partida no tiene respiro y no se parece al ritmo del arcade.

## Alcance

**Dentro:**

- Estado de fase en la partida (`game.phase` + `game.phaseTimer`) creado y actualizado desde `src/js/ghosts.js`, para no meter lÃ³gica de fantasmas en `game.js`.
- Alternancia indefinida: 7 s de scatter, 20 s de chase, en bucle (420 / 1200 frames a 60 fps).
- En scatter cada fantasma apunta a su `corner`; en chase mantiene su `target` de la spec 01.
- Al cambiar de fase los fantasmas invierten su direcciÃ³n actual (media vuelta), salvo los que estÃ¡n dentro del corral.
- Extraer `insidePen(g)` y la celda de salida `PEN_EXIT` a `ghosts.js`: los necesita la media vuelta y ya los usaba `decideGhost()`.

**Fuera (specs futuras):**

- Modo frightened, power pellets, fantasmas comestibles y ojos de regreso.
- Calendario decreciente de fases del arcade y velocidades distintas por fase.
- HUD o aviso visual del cambio de fase.

## Modelo de datos

Estado nuevo en la partida, sin tocar `createGame()` mÃ¡s allÃ¡ de una llamada:

- `game.phase`: `'scatter' | 'chase'`
- `game.phaseTimer`: frames que quedan de la fase actual

`src/js/ghosts.js` expone:

- `createGhostMode()` â†’ `{ phase: 'scatter', phaseTimer: SCATTER_FRAMES }`
- `updateGhostMode( game )` â†’ descuenta el temporizador, cambia de fase al llegar a 0 y aplica la media vuelta
- `ghostTarget( game, i )` â†’ `corner` en scatter, `GHOSTS[ i ].target( game )` en chase
- `insidePen( g )` â†’ `true` si el fantasma estÃ¡ en el corral
- `PEN_EXIT` â†’ `{ x: 13, y: 11 }`, casilla de salida sobre la puerta

## Plan de implementaciÃ³n

1. `ghosts.js`: aÃ±adir `PEN_EXIT`, `insidePen()` y usarlos desde `decideGhost()` en `game.js`. Manual: el juego se comporta igual que antes.
2. `ghosts.js`: `SCATTER_FRAMES`, `CHASE_FRAMES`, `createGhostMode()` y `updateGhostMode()`; `game.js` los llama en `createGame()`, `update()` y `resetPositions()`. Manual: a los 7 s los fantasmas dan media vuelta.
3. `ghosts.js`: `ghostTarget()` elige `corner` en scatter; `game.js` lo usa en `decideGhost()`. Manual: al empezar, cada fantasma se va a su esquina.
4. `tests/e2e.js`: casos de fase inicial, cambio a los 420 y 1620 frames, target scatter, media vuelta y no-media vuelta dentro del corral. Manual: `tests/e2e.html` muestra `E2E PASS`.

## Criterios de aceptaciÃ³n

> VerificaciÃ³n automatizada: abrir `tests/e2e.html` en el navegador (o `chrome --headless=new --dump-dom tests/e2e.html`); el resumen debe decir `E2E PASS`.

- [x] La partida empieza en `scatter` con `phaseTimer = 420`.
- [x] A los 420 frames la fase pasa a `chase` con `phaseTimer = 1200`.
- [x] A los 1620 frames vuelve a `scatter` con `phaseTimer = 420`.
- [x] En scatter `ghostTarget()` devuelve el `corner` de cada fantasma.
- [x] En chase `ghostTarget()` devuelve el `target` de la spec 01.
- [x] Al cambiar de fase los fantasmas fuera del corral invierten su `dir`; los de dentro no.
- [x] `resetPositions()` devuelve la fase a `scatter`.
- [x] Siguen sin atravesar muros y Pac-Man se mueve igual.
- [x] Los 14 casos de la spec 01 siguen en verde.

## Decisiones

- **SÃ­:** el estado de fase lo crea y lo actualiza `ghosts.js`. La spec 01 prometiÃ³ que los modos futuros vivirÃ­an ahÃ­; `game.js` solo hace tres llamadas.
- **SÃ­:** ciclo fijo de 7 s / 20 s en lugar del calendario decreciente del arcade. Es el ritmo reconocible con una constante menos; ajustarlo es cambiar dos nÃºmeros.
- **SÃ­:** media vuelta al cambiar de fase. Sin ella el cambio tarda en notarse y el jugador no percibe el respiro.
- **SÃ­:** se extrae `insidePen()`. La necesitan la media vuelta y `decideGhost()`; duplicarla serÃ­a peor.
- **No:** pausar el temporizador cuando la partida no estÃ¡ jugando. `update()` solo corre en `playing`, asÃ­ que ya no avanza.
- **No:** aviso visual de fase. No lo pide nadie y ensucia el canvas.

## Riesgos

| Riesgo                                              | MitigaciÃ³n                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| La media vuelta deja un fantasma mirando a un muro  | `decideGhost()` recalcula en la siguiente celda                   |
| Revertir dentro del corral retrasa la salida        | `updateGhostMode()` solo invierte fuera del corral                |
| Cambia la dificultad percibida                      | Los e2e fijan los tiempos; jugar una partida antes de cerrar      |
| Duraciones en frames asumen 60 fps                  | Es la misma suposiciÃ³n que ya usan `PACMAN_SPEED` y `GHOST_SPEED` |

## QuÃ© NO entra en esta spec

- Frightened, power pellets, fantasmas comestibles y ojos de regreso.
- Calendario de fases del arcade y velocidades por fase.
- Sonidos, HUD o indicadores de fase.

Cada uno, si llega, va en su propia spec.
