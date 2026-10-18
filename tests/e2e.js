// e2e.js
// Pruebas e2e de la spec 01 con los scripts reales del juego. Sin dependencias.

// La pagina debe cargar limpia: todo error de consola cuenta como fallo.
let erroresConsola = 0;
window.addEventListener( 'error', () => { erroresConsola++; } );
const consoleError = console.error;
console.error = () => { erroresConsola++; };

const resultados = [];

// Caso de prueba: ejecuta fn y apunta ok/fallo con su mensaje.
function test( nombre, fn ) {
  try {
    fn();
    resultados.push( { nombre, ok: true, msg: '' } );
  } catch ( err ) {
    resultados.push( { nombre, ok: false, msg: err.message } );
  }
}

function fallo( msg ) { throw new Error( msg ); }

function esIgual( a, b ) {
  if ( a !== b ) fallo( 'se esperaba ' + b + ', hubo ' + a );
}

function cercano( a, b ) {
  if ( Math.abs( a - b ) > 1e-9 ) fallo( 'se esperaba ' + b + ', hubo ' + a );
}

function celdaEs( t, x, y ) {
  if ( t.x !== x || t.y !== y ) fallo( 'se esperaba {x:' + x + ',y:' + y + '}, hubo {x:' + t.x + ',y:' + t.y + '}' );
}

// --- 1. Carga de los 4 modulos en el orden de index.html ---

test( 'carga: globals de maze/ghosts/game/render', () => {
  esIgual( MAZE.length, 31 );
  esIgual( MAZE[ 0 ].length, 28 );
  esIgual( GHOST_STARTS.length, 4 );
  esIgual( GHOSTS.length, 4 );
  esIgual( typeof createGame, 'function' );
  esIgual( typeof update, 'function' );
  esIgual( typeof draw, 'function' );
} );

// --- 2. Colores por fantasma ---

test( 'colores: rojo, rosa, cian y naranja en GHOSTS', () => {
  const esperados = [ '#ff0000', '#ffb8ff', '#00ffff', '#ffb852' ];
  for ( let i = 0; i < 4; i++ ) esIgual( GHOSTS[ i ].color, esperados[ i ] );
} );

// Canvas real: draw() pinta cada fantasma en su celda de inicio.
const canvas = document.getElementById( 'canvas-test' );
const ctx = canvas.getContext( '2d' );
const game = createGame();
draw( ctx, game, 1 );

function pixel( x, y ) {
  const d = ctx.getImageData( x, y, 1, 1 ).data;
  return [ d[ 0 ], d[ 1 ], d[ 2 ] ];
}

function colorEs( c, r, g, b ) {
  const canales = [ r, g, b ];
  const nombres = [ 'r', 'g', 'b' ];
  canales.forEach( ( esperado, i ) => {
    if ( Math.abs( c[ i ] - esperado ) > 32 ) {
      fallo( 'canal ' + nombres[ i ] + ': se esperaba ~' + esperado + ', hubo ' + c[ i ] );
    }
  } );
}

test( 'canvas: cada fantasma se pinta de su color', () => {
  GHOST_STARTS.forEach( ( s, i ) => {
    const hex = GHOSTS[ i ].color;
    colorEs(
      pixel( s.x * 20 + 10, s.y * 20 + 15 ),
      parseInt( hex.slice( 1, 3 ), 16 ),
      parseInt( hex.slice( 3, 5 ), 16 ),
      parseInt( hex.slice( 5, 7 ), 16 )
    );
  } );
} );

// --- 3-6. Targeting por personalidad ---

test( 'blinky: target = casilla de pacman', () => {
  const g = createGame();
  g.pacman.x = 10.3;
  g.pacman.y = 20.6;
  celdaEs( GHOSTS[ 0 ].target( g ), 10, 21 );
} );

test( 'pinky: 4 celdas delante de pacman segun su dir', () => {
  const g = createGame();
  g.pacman.x = 10;
  g.pacman.y = 20;
  g.pacman.dir = 'left';
  celdaEs( GHOSTS[ 1 ].target( g ), 6, 20 );
  g.pacman.dir = 'up';
  celdaEs( GHOSTS[ 1 ].target( g ), 10, 16 );
} );

test( 'inky: simetrico de blinky respecto al punto 2 delante', () => {
  const g = createGame();
  g.pacman.x = 10;
  g.pacman.y = 20;
  g.pacman.dir = 'right';
  g.ghosts[ 0 ].x = 5;
  g.ghosts[ 0 ].y = 17;
  celdaEs( GHOSTS[ 2 ].target( g ), 19, 23 );
} );

test( 'clyde: persigue a >8 y su corner a <=8 (manhattan)', () => {
  const g = createGame();
  g.pacman.x = 10;
  g.pacman.y = 20;
  g.ghosts[ 3 ].x = 5;
  g.ghosts[ 3 ].y = 5;
  celdaEs( GHOSTS[ 3 ].target( g ), 10, 20 );
  g.ghosts[ 3 ].x = 10;
  g.ghosts[ 3 ].y = 19;
  celdaEs( GHOSTS[ 3 ].target( g ), GHOSTS[ 3 ].corner.x, GHOSTS[ 3 ].corner.y );
} );

// --- 7. Muros y puerta del corral ---

test( 'muros: 600 frames y ningun fantasma entra en pared', () => {
  const g = createGame();
  for ( let f = 0; f < 600; f++ ) {
    update( g );
    for ( const ghost of g.ghosts ) {
      if ( g.grid[ Math.round( ghost.y ) ][ Math.round( ghost.x ) ] === 1 ) {
        fallo( 'fantasma en pared en frame ' + f + ': (' + ghost.x + ',' + ghost.y + ')' );
      }
    }
  }
} );

test( 'puerta: bloquea a pacman', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 13;
  p.y = 13;
  p.dir = 'up';
  for ( let f = 0; f < 60; f++ ) {
    update( g );
    if ( Math.round( p.y ) < 13 ) fallo( 'pacman cruzo la puerta: y=' + p.y );
  }
} );

test( 'corral: los 4 fantasmas salen en 600 frames', () => {
  const g = createGame();
  g.state = 'playing';
  // Pacman aparcado en un muro: partida determinista, sin resets.
  g.pacman.x = 5;
  g.pacman.y = 23;
  g.pacman.dir = 'left';
  const minY = [ 99, 99, 99, 99 ];
  for ( let f = 0; f < 600; f++ ) {
    update( g );
    g.ghosts.forEach( ( ghost, i ) => {
      minY[ i ] = Math.min( minY[ i ], Math.round( ghost.y ) );
    } );
  }
  minY.forEach( ( y, i ) => {
    if ( y > 11 ) fallo( 'fantasma ' + i + ' nunca salio del corral (min y=' + y + ')' );
  } );
} );

// --- 8. Movimiento de pacman intacto ---

test( 'pacman: velocidad 1/8 celda por frame', () => {
  const g = createGame();
  const p = g.pacman;
  esIgual( p.speed, 0.125 );
  update( g );
  cercano( p.x, 12.875 );
  esIgual( p.y, 23 );
} );

test( 'pacman: giro bufferado al quedar alineado', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 6;
  p.y = 23;
  p.dir = 'left';
  p.nextDir = 'up';
  update( g );
  esIgual( p.dir, 'up' );
  esIgual( p.nextDir, null );
  cercano( p.y, 22.875 );
} );

test( 'pacman: tunel con wrap en la fila 14', () => {
  const g = createGame();
  const p = g.pacman;
  p.x = 0;
  p.y = 14;
  p.dir = 'left';
  for ( let f = 0; f < 8; f++ ) update( g );
  cercano( p.x, 27 );
} );

// --- Consola limpia (se evalua al final) ---

resultados.push( {
  nombre: 'consola limpia durante toda la ejecucion',
  ok: erroresConsola === 0,
  msg: erroresConsola ? erroresConsola + ' errores de consola' : '',
} );

// --- Resumen en el DOM y en el titulo ---

let pass = 0;
const lista = document.getElementById( 'e2e-results' );
for ( const r of resultados ) {
  if ( r.ok ) pass++;
  const li = document.createElement( 'li' );
  li.className = r.ok ? 'ok' : 'fallo';
  li.textContent = ( r.ok ? 'OK   ' : 'FALLO' ) + '  ' + r.nombre + ( r.msg ? ' - ' + r.msg : '' );
  lista.appendChild( li );
}
const total = resultados.length;
const todoOk = pass === total;
document.getElementById( 'e2e-summary' ).textContent =
  'E2E ' + ( todoOk ? 'PASS' : 'FAIL' ) + ' ' + pass + '/' + total;
document.title = todoOk ? 'E2E OK' : 'E2E FALLOS';
