// ghosts.js
// Personalidades de los 4 fantasmas en modo persecucion (chase).
// Depende de globals de game.js: DIRS.
// Mapeo de indices de GHOST_STARTS: 0 blinky, 1 pinky, 2 inky, 3 clyde.

// Casilla actual de Pac-Man, redondeada a celda.
function pacmanCell( game ) {
  return { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };
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
