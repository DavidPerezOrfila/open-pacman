// ghosts.js
// Personalidades de los 4 fantasmas y modos scatter/chase/frightened.
// Depende de globals de game.js: DIRS, OPPOSITE.
// Mapeo de indices de GHOST_STARTS: 0 blinky, 1 pinky, 2 inky, 3 clyde.

// Casilla actual de Pac-Man, redondeada a celda.
function pacmanCell( game ) {
  return { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };
}

// Casilla de salida sobre la puerta y zona del corral.
const PEN_EXIT = { x: 13, y: 11 };
const SCATTER_FRAMES = 7 * 60; // 7s a 60fps
const CHASE_FRAMES = 20 * 60;  // 20s
const FRIGHTENED_FRAMES = 8 * 60; // 8s

function insidePen( g ) {
  const x = Math.round( g.x );
  const y = Math.round( g.y );
  return y >= 12 && x >= 11 && x <= 16;
}

const GHOSTS = [
  {
    name: 'blinky',
    color: '#ff0000',
    corner: { x: 26, y: 1 }, // superior-derecha
    // Agresivo: va directo a la casilla de Pac-Man.
    target: pacmanCell,
  },
  {
    name: 'pinky',
    color: '#ffb8ff',
    corner: { x: 1, y: 1 }, // superior-izquierda
    // Embosca: 4 celdas delante de Pac-Man segun su direccion.
    target: ( game ) => {
      const c = pacmanCell( game );
      const d = DIRS[ game.pacman.dir ] || { x: 0, y: 0 };
      return { x: c.x + 4 * d.x, y: c.y + 4 * d.y };
    },
  },
  {
    name: 'inky',
    color: '#00ffff',
    corner: { x: 26, y: 29 }, // inferior-derecha
    // Flanquea: punto 2 delante de Pac-Man reflejado respecto a Blinky.
    target: ( game ) => {
      const c = pacmanCell( game );
      const d = DIRS[ game.pacman.dir ] || { x: 0, y: 0 };
      const ax = c.x + 2 * d.x;
      const ay = c.y + 2 * d.y;
      const bx = Math.round( game.ghosts[ 0 ].x );
      const by = Math.round( game.ghosts[ 0 ].y );
      return { x: ax + ( ax - bx ), y: ay + ( ay - by ) };
    },
  },
  {
    name: 'clyde',
    color: '#ffb852',
    corner: { x: 1, y: 29 }, // inferior-izquierda
    // Timido: a mas de 8 celdas persigue; a 8 o menos se retira a su esquina.
    target: function ( game ) {
      const c = pacmanCell( game );
      const gx = Math.round( game.ghosts[ 3 ].x );
      const gy = Math.round( game.ghosts[ 3 ].y );
      if ( Math.abs( gx - c.x ) + Math.abs( gy - c.y ) > 8 ) return c;
      return this.corner;
    },
  },
];

window.GHOSTS = GHOSTS;
window.frightened = frightened;
window.startFrightened = startFrightened;

// --- Modos scatter / chase / frightened ---

// Estado inicial de la partida: se esparce sobre game en createGame().
function createGhostMode() {
  return { phase: 'scatter', phaseTimer: SCATTER_FRAMES, frightenedTimer: 0 };
}

function frightened( game ) {
  return game.frightenedTimer > 0;
}

// Power pellet comida: reinicia el temporizador y, como el cambio de fase,
// los fantasmas de fuera del corral dan media vuelta.
function startFrightened( game ) {
  game.frightenedTimer = FRIGHTENED_FRAMES;
  for ( const g of game.ghosts ) {
    if ( !insidePen( g ) ) g.dir = OPPOSITE[ g.dir ];
  }
}

// Al agotarse el temporizador cambia de fase; los fantasmas de fuera del
// corral dan media vuelta (fuera no hay decision en una celda alineada).
function updateGhostMode( game ) {
  if ( game.frightenedTimer > 0 ) game.frightenedTimer--;
  game.phaseTimer--;
  if ( game.phaseTimer > 0 ) return;
  game.phase = game.phase === 'scatter' ? 'chase' : 'scatter';
  game.phaseTimer = game.phase === 'scatter' ? SCATTER_FRAMES : CHASE_FRAMES;
  for ( const g of game.ghosts ) {
    if ( !insidePen( g ) ) g.dir = OPPOSITE[ g.dir ];
  }
}

// En frightened cada fantasma huye a la esquina opuesta a Pac-Man respecto
// al centro del laberinto.
function frightenedTarget( game ) {
  const c = pacmanCell( game );
  return { x: game.grid[ 0 ].length - 1 - c.x, y: game.grid.length - 1 - c.y };
}

// Precedencia: frightened (huida) > scatter (corner) > chase (personalidad).
function ghostTarget( game, i ) {
  if ( frightened( game ) ) return frightenedTarget( game );
  return game.phase === 'scatter' ? GHOSTS[ i ].corner : GHOSTS[ i ].target( game );
}

window.frightenedTarget = frightenedTarget;
